import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

/**
 * Executes a gcloud command and returns the result as JSON
 * @param gcloudPath Path to the gcloud executable
 * @param command The command to execute
 * @param projectId Optional project ID to use
 * @returns The parsed JSON result
 */
export async function executeGcloudCommand(gcloudPath: string, command: string, projectId?: string) {
  try {
    // Only add project flag if projectId is provided and not empty
    const projectFlag = projectId && projectId.trim() !== "" ? ` --project=${projectId}` : "";
    const fullCommand = `${gcloudPath} ${command}${projectFlag} --format=json`;
    
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
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      console.error(`Error parsing JSON: ${error}`);
      console.error(`Raw output: ${stdout}`);
      throw new Error(`Failed to parse command output as JSON: ${error}`);
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
  try {
    // Use direct command to get projects
    const { stdout } = await execPromise(`${gcloudPath} projects list --format=json`);
    
    if (!stdout || stdout.trim() === "") {
      return [];
    }
    
    const projects = JSON.parse(stdout);
    
    return projects.map((project: any) => ({
      id: project.projectId,
      name: project.name,
      projectNumber: project.projectNumber,
      createTime: project.createTime || new Date().toISOString()
    }));
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }
}
