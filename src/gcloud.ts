import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// Global cache for command results to reduce API calls
const commandCache = new Map<string, { result: any; timestamp: number }>();
const COMMAND_CACHE_TTL = 600000; // 10 minutes cache TTL
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Executes a gcloud command and returns the result as JSON
 * @param gcloudPath Path to the gcloud executable
 * @param command The command to execute
 * @param projectId Optional project ID to use
 * @param options Additional options for the command
 * @returns The parsed JSON result
 */
export async function executeGcloudCommand(
  gcloudPath: string, 
  command: string, 
  projectId?: string,
  options: { 
    skipCache?: boolean;
    cacheTTL?: number;
    maxRetries?: number;
  } = {}
) {
  // Validate inputs
  if (!gcloudPath || typeof gcloudPath !== 'string') {
    throw new Error("Invalid gcloud path: must be a non-empty string");
  }
  
  if (!command || typeof command !== 'string') {
    throw new Error("Invalid command: must be a non-empty string");
  }
  
  try {
    const { skipCache = false, cacheTTL = COMMAND_CACHE_TTL, maxRetries = 1 } = options;
    
    // Only add project flag if projectId is provided and not empty
    const projectFlag = projectId && typeof projectId === 'string' && projectId.trim() !== "" 
      ? ` --project=${projectId}` 
      : "";
    const fullCommand = `${gcloudPath} ${command}${projectFlag} --format=json`;
    
    // Generate a cache key from the command
    const cacheKey = fullCommand;
    
    // Check for pending requests for the same command to avoid duplicate API calls
    if (pendingRequests.has(cacheKey)) {
      console.log(`Reusing pending request for: ${fullCommand}`);
      return pendingRequests.get(cacheKey);
    }
    
    // Check cache unless explicitly told to skip it
    if (!skipCache) {
      const cachedResult = commandCache.get(cacheKey);
      const now = Date.now();
      
      if (cachedResult && (now - cachedResult.timestamp < cacheTTL)) {
        console.log(`Using cached result for: ${fullCommand}`);
        return cachedResult.result;
      }
    }
    
    // Create a promise for this request
    const requestPromise = executeCommand(fullCommand, cacheKey, maxRetries);
    
    // Store the promise so parallel calls can use it
    pendingRequests.set(cacheKey, requestPromise);
    
    try {
      return await requestPromise;
    } finally {
      // Clean up the pending request
      pendingRequests.delete(cacheKey);
    }
  } catch (error: any) {
    console.error(`Error executing command: ${error.message}`);
    if (error.stderr) {
      console.error(`Command stderr: ${error.stderr}`);
    }
    throw error;
  }
}

/**
 * Private helper to execute the actual command
 */
async function executeCommand(fullCommand: string, cacheKey: string, maxRetries: number, currentRetry: number = 0): Promise<any> {
  try {
    console.log(`Executing command: ${fullCommand}`);
    
    // Increase maxBuffer to handle large outputs (10MB)
    const { stdout, stderr } = await execPromise(fullCommand, { maxBuffer: 10 * 1024 * 1024 });
    
    if (stderr) {
      console.warn(`Command produced stderr: ${stderr}`);
    }
    
    if (!stdout || stdout.trim() === "") {
      console.log("Command returned empty output");
      return [];
    }
    
    try {
      const result = JSON.parse(stdout);
      const parsedResult = Array.isArray(result) ? result : [result];
      
      // Store in cache
      commandCache.set(cacheKey, { result: parsedResult, timestamp: Date.now() });
      
      return parsedResult;
    } catch (error) {
      console.error(`Error parsing JSON: ${error}`);
      console.error(`Raw output: ${stdout}`);
      throw new Error(`Failed to parse command output as JSON: ${error}`);
    }
  } catch (error: any) {
    // Retry on error if we haven't exceeded max retries
    if (currentRetry < maxRetries) {
      console.log(`Retrying command (attempt ${currentRetry + 1}/${maxRetries}): ${fullCommand}`);
      // Exponential backoff: wait longer between retries
      const backoffMs = 1000 * Math.pow(2, currentRetry);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return executeCommand(fullCommand, cacheKey, maxRetries, currentRetry + 1);
    }
    
    throw error;
  }
}

/**
 * Clears the command cache for paths matching the pattern
 */
export function clearCommandCache(pattern?: RegExp) {
  if (!pattern) {
    commandCache.clear();
    return;
  }
  
  for (const key of commandCache.keys()) {
    if (pattern.test(key)) {
      commandCache.delete(key);
    }
  }
}

/**
 * Checks if the user is authenticated with gcloud
 * @param gcloudPath Path to the gcloud executable
 * @returns True if authenticated, false otherwise
 */
export async function isAuthenticated(gcloudPath: string): Promise<boolean> {
  try {
    // Use a more direct command to check authentication
    const { stdout } = await execPromise(`${gcloudPath} auth list --format="value(account)" --filter="status=ACTIVE"`);
    return stdout.trim() !== "";
  } catch (error) {
    console.error("Error checking authentication status:", error);
    return false;
  }
}

/**
 * Gets the list of projects the user has access to
 * @param gcloudPath Path to the gcloud executable
 * @returns Array of projects
 */
export async function getProjects(gcloudPath: string) {
  if (!gcloudPath || typeof gcloudPath !== 'string') {
    throw new Error("Invalid gcloud path: must be a non-empty string");
  }
  
  try {
    // Check cache first
    const cacheKey = `${gcloudPath} projects list --format=json`;
    const cachedResult = commandCache.get(cacheKey);
    const now = Date.now();
    
    // Use a longer TTL for projects list (30 minutes)
    if (cachedResult && (now - cachedResult.timestamp < 1800000)) {
      console.log("Using cached projects list");
      return cachedResult.result;
    }
    
    // Use direct command to get projects
    const { stdout } = await execPromise(`${gcloudPath} projects list --format=json`);
    
    if (!stdout || stdout.trim() === "") {
      console.log("No projects found or empty response");
      return [];
    }
    
    let projects;
    try {
      projects = JSON.parse(stdout);
    } catch (parseError: any) {
      console.error("Error parsing projects JSON:", parseError);
      throw new Error(`Failed to parse projects output: ${parseError.message}`);
    }
    
    if (!Array.isArray(projects)) {
      console.error("Projects response is not an array:", projects);
      return [];
    }
    
    const mappedProjects = projects.map((project: any) => {
      // Validate project object to ensure it has required fields
      if (!project || !project.projectId) {
        console.warn("Skipping invalid project:", project);
        return null;
      }
      
      return {
        id: project.projectId,
        name: project.name || project.projectId,
        projectNumber: project.projectNumber || "",
        createTime: project.createTime || new Date().toISOString()
      };
    }).filter(Boolean); // Remove null entries
    
    // Cache the result
    commandCache.set(cacheKey, { result: mappedProjects, timestamp: now });
    
    return mappedProjects;
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }
}
