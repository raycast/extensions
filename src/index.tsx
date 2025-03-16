import { ActionPanel, Action, List, showToast, Toast, Icon, Form, useNavigation, Color, Cache, open, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { join } from "path";
import fs from "fs";
import ProjectView from "./ProjectView";
import { StorageBucketView, StorageTransferView, IAMMembersView, IAMMembersByPrincipalView, StorageStatsView } from "./services/storage";
import { IAMMembersByPrincipalView as IAMProjectMembersByPrincipalView, IAMView } from "./services/iam";
import { executeGcloudCommand } from "./gcloud";
import { CacheManager, Project } from "./utils/CacheManager";
import CachedProjectView from "./views/CachedProjectView";

const execPromise = promisify(exec);
const GCLOUD_PATH = "/usr/local/bin/gcloud";

// Create a navigation cache instance
const navigationCache = new Cache({ namespace: "navigation-state" });

interface Preferences {
  projectId?: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({});
  const [showCachedProjectView, setShowCachedProjectView] = useState(false);
  const [shouldNavigateToProject, setShouldNavigateToProject] = useState<string | null>(null);
  const { push, pop } = useNavigation();

  // Handle navigation to project with useEffect
  useEffect(() => {
    if (shouldNavigateToProject) {
      push(<ProjectView projectId={shouldNavigateToProject} gcloudPath={GCLOUD_PATH} />);
      setShouldNavigateToProject(null);
    }
  }, [shouldNavigateToProject, push]);

  useEffect(() => {
    checkGcloudInstallation();
  }, []);

  async function checkGcloudInstallation() {
    try {
      await execPromise(`${GCLOUD_PATH} --version`);
      initializeFromCache();
    } catch (error) {
      setIsLoading(false);
      setError("Google Cloud SDK not found. Please install it using Homebrew: brew install google-cloud-sdk");
      showToast({
        style: Toast.Style.Failure,
        title: "Google Cloud SDK not found",
        message: "Please install it using Homebrew",
      });
    }
  }

  // New function to initialize from cache
  async function initializeFromCache() {
    // Check if we should show the projects list instead of the cached project view
    const showProjectsList = navigationCache.get("showProjectsList");
    if (showProjectsList === "true") {
      // Clear the flag
      navigationCache.remove("showProjectsList");
      // Skip the cached project view
      checkAuthStatus();
      return;
    }
    
    // Try to get authentication status from cache
    const cachedAuth = CacheManager.getAuthStatus();
    
    if (cachedAuth && cachedAuth.isAuthenticated) {
      setIsAuthenticated(true);
      
      // Try to get projects list from cache
      const cachedProjects = CacheManager.getProjectsList();
      
      if (cachedProjects) {
        setProjects(cachedProjects.projects);
        
        // Try to get selected project from cache
        const cachedProject = CacheManager.getSelectedProject();
        
        if (cachedProject) {
          setPreferences({ projectId: cachedProject.projectId });
          
          // If we have all cached data, show the cached project view
          setShowCachedProjectView(true);
          setIsLoading(false);
          
          // Optionally refresh in background
          setTimeout(() => {
            checkAuthStatus(true);
          }, 1000);
          
          return;
        }
      }
    }
    
    // If we don't have complete cached data, check auth status normally
    checkAuthStatus();
  }

  async function checkAuthStatus(silent = false) {
    if (!silent) {
      setIsLoading(true);
    }
    
    let loadingToast;
    if (!silent) {
      loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Checking authentication status...",
      });
    }
    
    try {
      // Only check auth status, don't make changes that could log the user out
      const { stdout } = await execPromise(`${GCLOUD_PATH} auth list --format="value(account)" --filter="status=ACTIVE"`);
      
      if (stdout.trim()) {
        setIsAuthenticated(true);
        
        // Only update cache if not already authenticated to prevent unexpected cache updates
        if (!isAuthenticated) {
          // Cache the authentication status
          CacheManager.saveAuthStatus(true, stdout.trim());
        }
        
        if (!silent && loadingToast) {
          loadingToast.hide();
          showToast({
            style: Toast.Style.Success,
            title: "Authenticated",
            message: stdout.trim(),
          });
        }
        
        fetchProjects(silent);
      } else {
        setIsAuthenticated(false);
        setIsLoading(false);
        
        // Clear auth cache only if we were previously authenticated
        if (isAuthenticated) {
          CacheManager.clearAuthCache();
        }
        
        if (!silent && loadingToast) {
          loadingToast.hide();
          showToast({
            style: Toast.Style.Failure,
            title: "Not authenticated",
            message: "Please authenticate with Google Cloud",
          });
        }
      }
    } catch (error: any) {
      // Only change auth state if there's a definitive failure
      if (error.message.includes("not logged in") || error.message.includes("no active account")) {
        setIsAuthenticated(false);
        
        // Clear auth cache only if we were previously authenticated
        if (isAuthenticated) {
          CacheManager.clearAuthCache();
        }
      }
      
      setIsLoading(false);
      
      if (!silent) {
        setError(`Authentication check failed: ${error.message}`);
        if (loadingToast) {
          loadingToast.hide();
        }
        showToast({
          style: Toast.Style.Failure,
          title: "Authentication check failed",
          message: error.message,
        });
      }
    }
  }

  async function fetchProjects(silent = false) {
    if (!silent) {
      setIsLoading(true);
    }
    
    let loadingToast;
    if (!silent) {
      loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading projects...",
      });
    }
    
    try {
      const { stdout } = await execPromise(`${GCLOUD_PATH} projects list --format=json`);
      
      const projectsData = JSON.parse(stdout);
      
      if (projectsData && projectsData.length > 0) {
        const formattedProjects = projectsData.map((project: any) => ({
          id: project.projectId,
          name: project.name,
          projectNumber: project.projectNumber,
          createTime: project.createTime || new Date().toISOString()
        }));
        
        setProjects(formattedProjects);
        
        // Cache the projects list
        CacheManager.saveProjectsList(formattedProjects);
        
        // Try to get selected project from cache or preferences
        const cachedProject = CacheManager.getSelectedProject();
        
        if (cachedProject) {
          setPreferences({ projectId: cachedProject.projectId });
        }
        
        if (!silent && loadingToast) {
          loadingToast.hide();
          showToast({
            style: Toast.Style.Success,
            title: "Projects loaded",
            message: `Found ${formattedProjects.length} projects`,
          });
        }
      } else {
        setProjects([]);
        
        // Clear projects list cache
        CacheManager.clearProjectsListCache();
        
        if (!silent && loadingToast) {
          loadingToast.hide();
          showToast({
            style: Toast.Style.Failure,
            title: "No projects found",
            message: "Create a project in Google Cloud Console",
          });
        }
      }
    } catch (error: any) {
      if (!silent) {
        setError(`Failed to fetch projects: ${error.message}`);
        if (loadingToast) {
          loadingToast.hide();
        }
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch projects",
          message: error.message,
        });
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }

  async function authenticate() {
    try {
      console.log("Starting Google Cloud authentication process");
      
      // Show a dedicated authentication view that will handle the process
      push(<AuthenticationView gcloudPath={GCLOUD_PATH} onAuthenticated={() => {
        setIsAuthenticated(true);
        fetchProjects();
      }} />);
      
    } catch (error: any) {
      console.error(`Authentication error: ${error.message}`);
      setError(`Authentication failed: ${error.message}`);
      
      // Clear auth cache
      CacheManager.clearAuthCache();
      
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication failed",
        message: error.message,
      });
    }
  }

  async function selectProject(projectId: string) {
    if (!projectId || typeof projectId !== 'string') {
      console.error("Invalid project ID provided to selectProject:", projectId);
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid project ID",
        message: "Cannot select project with invalid ID"
      });
      return;
    }
    
    const selectingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Selecting project...",
      message: projectId,
    });
    
    try {
      await execPromise(`${GCLOUD_PATH} config set project ${projectId}`);
      
      // Save to cache and preferences
      CacheManager.saveSelectedProject(projectId);
      setPreferences({ projectId });
      
      selectingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Project selected",
        message: projectId,
      });
      
      // Save to cached projects list in the background
      CacheManager.getRecentlyUsedProjectsWithDetails(GCLOUD_PATH).catch(error => {
        console.error("Error updating cached projects:", error);
      });
      
      // Use state to trigger navigation in useEffect
      setShouldNavigateToProject(projectId);
    } catch (error: any) {
      selectingToast.hide();
      setError(`Failed to select project: ${error.message}`);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to select project",
        message: error.message,
      });
    }
  }

  function viewProject(projectId: string) {
    // Save this project as recently used
    CacheManager.saveSelectedProject(projectId);
    
    // Use state to trigger navigation in useEffect
    setShouldNavigateToProject(projectId);
  }

  function viewStorageBuckets(projectId: string) {
    push(<StorageBucketView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
  }

  function viewStorageTransfer(projectId: string) {
    push(<StorageTransferView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
  }

  function viewStorageStats(projectId: string) {
    push(<StorageStatsView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
  }

  function clearCache() {
    CacheManager.clearAllCaches();
    setShowCachedProjectView(false);
    checkAuthStatus();
  }

  // Update the AuthenticationView component
  function AuthenticationView({ gcloudPath, onAuthenticated }: { gcloudPath: string; onAuthenticated: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [authUrl, setAuthUrl] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [statusMessage, setStatusMessage] = useState("Enter the verification code from Google");
    const [authProcess, setAuthProcess] = useState<ReturnType<typeof exec> | null>(null);
    const { pop } = useNavigation();
    
    // Start authentication process when component mounts
    useEffect(() => {
      startAuthentication();
      
      // Cleanup function to handle component unmount
      return () => {
        if (authProcess) {
          try {
            authProcess.kill();
          } catch (error) {
            console.error("Error killing auth process:", error);
          }
        }
      };
    }, []);
    
    async function startAuthentication() {
      setIsLoading(true);
      setStatusMessage("Initializing authentication...");
      
      try {
        // Execute the gcloud auth login command
        const process = exec(`${gcloudPath} auth login --no-launch-browser`, { maxBuffer: 1024 * 1024 });
        setAuthProcess(process);
        
        // Listen for stdout data to capture instructions
        process.stdout?.on('data', (data) => {
          console.log(`Auth process stdout: ${data}`);
          const output = data.toString();
          
          if (output.includes("Enter verification code:") || output.includes("Enter authorization code:")) {
            setStatusMessage("Enter the verification code from Google");
            setIsLoading(false);
          }
        });
        
        // Listen for stderr to detect errors and extract URL
        process.stderr?.on('data', (data) => {
          console.error(`Auth process stderr: ${data}`);
          const output = data.toString();
          
          // Extract the auth URL if present
          const urlMatch = output.match(/(https:\/\/accounts\.google\.com\/o\/oauth2\/auth[^\s]+)/);
          if (urlMatch && urlMatch[1]) {
            setAuthUrl(urlMatch[1]);
            setStatusMessage("Authentication URL detected - Enter code from browser");
            setIsLoading(false);
            
            // Automatically open the URL in the browser
            open(urlMatch[1]);
          }
        });
        
        // Handle process completion
        process.on('close', async (code) => {
          console.log(`Auth process exited with code ${code}`);
          
          if (code === 0) {
            setStatusMessage("Verifying authentication...");
            setIsLoading(true);
            
            try {
              const { stdout } = await execPromise(`${gcloudPath} auth list --format="value(account)" --filter="status=ACTIVE"`);
              
              if (stdout.trim()) {
                // Cache the authentication status
                CacheManager.saveAuthStatus(true, stdout.trim());
                showToast({
                  style: Toast.Style.Success,
                  title: "Authenticated as",
                  message: stdout.trim()
                });
                
                // Call the onAuthenticated callback
                onAuthenticated();
                pop();
              } else {
                setStatusMessage("Authentication failed - try again");
                setIsLoading(false);
              }
            } catch (error: any) {
              setStatusMessage(`Error: ${error.message}`);
              setIsLoading(false);
            }
          } else {
            setStatusMessage("Authentication failed - try again");
            setIsLoading(false);
          }
        });
        
        // Handle process errors
        process.on('error', (error) => {
          console.error(`Auth process error: ${error.message}`);
          setStatusMessage(`Error: ${error.message}`);
          setIsLoading(false);
        });
        
      } catch (error: any) {
        console.error(`Authentication error: ${error.message}`);
        setStatusMessage(`Error: ${error.message}`);
        setIsLoading(false);
      }
    }
    
    // Function to submit verification code to the process
    async function submitVerificationCode() {
      if (!verificationCode.trim()) {
        setStatusMessage("Please enter a valid verification code");
        return;
      }
      
      setIsLoading(true);
      setStatusMessage("Submitting code...");
      
      try {
        if (authProcess && authProcess.stdin) {
          // Write the verification code to the process stdin
          authProcess.stdin.write(verificationCode + '\n');
        } else {
          setStatusMessage("Error: Authentication process not ready");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error submitting verification code:", error);
        setStatusMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        setIsLoading(false);
      }
    }
    
    // Function to restart the authentication process
    function restartAuthentication() {
      if (authProcess) {
        try {
          authProcess.kill();
        } catch (error) {
          console.error("Error killing auth process:", error);
        }
      }
      
      // Reset state
      setVerificationCode("");
      setAuthUrl("");
      
      // Start the authentication process again
      startAuthentication();
    }
    
    // Single authentication screen with simplified UI
    if (!isLoading) {
      return (
        <Form
          actions={
            <ActionPanel>
              <Action
                title="Submit Code"
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={submitVerificationCode}
              />
              <Action
                title="Restart Authentication"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={restartAuthentication}
              />
              <Action
                title="Cancel"
                icon={Icon.XmarkCircle}
                onAction={() => {
                  if (authProcess) {
                    try {
                      authProcess.kill();
                    } catch (error) {
                      console.error("Error killing auth process:", error);
                    }
                  }
                  pop();
                }}
              />
            </ActionPanel>
          }
        >
          <Form.Description
            title="Google Cloud Authentication"
            text={statusMessage}
          />
          {authUrl && (
            <Form.Description
              title="Authentication URL"
              text={`[Click here to open authentication page](${authUrl})`}
            />
          )}
          <Form.TextField
            id="verificationCode"
            title="Verification Code"
            placeholder="Enter code from Google"
            value={verificationCode}
            onChange={setVerificationCode}
            autoFocus
          />
        </Form>
      );
    } else {
      return (
        <Detail
          navigationTitle="Google Cloud Authentication"
          markdown={`# Google Cloud Authentication

⏳ ${statusMessage}
          
${authUrl ? `\n\n[Click here to open authentication page](${authUrl})` : ""}`}
          actions={
            <ActionPanel>
              <Action
                title="Cancel"
                icon={Icon.XmarkCircle}
                onAction={() => {
                  if (authProcess) {
                    try {
                      authProcess.kill();
                    } catch (error) {
                      console.error("Error killing auth process:", error);
                    }
                  }
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      );
    }
  }

  // Update loginWithDifferentAccount to use the new authentication view
  async function loginWithDifferentAccount() {
    // Clear auth cache first
    CacheManager.clearAuthCache();
    
    // First show toast for revoking current credentials
    const revokingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Logging out current account...",
      message: "Revoking current credentials"
    });
    
    try {
      console.log("Revoking all existing credentials");
      // Force new authentication - first revoke all existing credentials
      await execPromise(`${GCLOUD_PATH} auth revoke --all --quiet`);
      revokingToast.hide();
      
      // Show the authentication view
      push(<AuthenticationView gcloudPath={GCLOUD_PATH} onAuthenticated={() => {
        setIsAuthenticated(true);
        // Clear cached project to avoid confusion with the new account
        CacheManager.clearProjectCache();
        // Reset state and navigation
        setShowCachedProjectView(false);
        fetchProjects();
      }} />);
      
    } catch (error: any) {
      console.error(`Account switch error: ${error.message}`);
      revokingToast?.hide();
      setError(`Authentication switch failed: ${error.message}`);
      
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication failed",
        message: error.message
      });
      
      // Re-check authentication status to recover
      checkAuthStatus();
    }
  }

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView 
          title={error} 
          description="An error occurred"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.RotateClockwise} onAction={checkGcloudInstallation} />
              <Action title="Clear Cache" icon={Icon.Trash} onAction={clearCache} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!isAuthenticated) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView 
          title="Not authenticated with Google Cloud" 
          description="Please authenticate to continue"
          icon={{ source: Icon.Person, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Authenticate" icon={Icon.Key} onAction={authenticate} />
              <Action title="Clear Cache" icon={Icon.Trash} onAction={clearCache} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // If we have a cached project and showCachedProjectView is true, show the cached project view
  if (showCachedProjectView) {
    return (
      <CachedProjectView 
        gcloudPath={GCLOUD_PATH} 
        onLoginWithDifferentAccount={loginWithDifferentAccount} 
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      navigationTitle="Google Cloud Projects"
      isShowingDetail
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={() => fetchProjects(false)} />
          <Action title="Clear Cache" icon={Icon.Trash} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} onAction={clearCache} />
          <Action title="Login with Different Account" icon={Icon.Person} shortcut={{ modifiers: ["cmd"], key: "l" }} onAction={loginWithDifferentAccount} />
        </ActionPanel>
      }
    >
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView 
          title="No projects found" 
          description="Create a project in Google Cloud Console"
          icon={{ source: Icon.Document, tintColor: Color.Blue }}
        />
      ) : (
        <>
          <List.Section title="Account Actions">
            <List.Item
              icon={{ source: Icon.Person, tintColor: Color.Orange }}
              title="Login with Different Account"
              subtitle="Switch to another Google Cloud account"
              actions={
                <ActionPanel>
                  <Action
                    title="Switch Account"
                    icon={Icon.Switch}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    onAction={loginWithDifferentAccount}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Google Cloud Projects" subtitle={`${projects.length} projects`}>
            {projects.map((project) => (
              <List.Item
                key={project.id}
                title={project.name}
                subtitle=""
                icon={{ source: preferences.projectId === project.id ? Icon.CheckCircle : Icon.Circle, tintColor: preferences.projectId === project.id ? Color.Green : Color.SecondaryText }}
                accessories={[
                  { text: project.id },
                  { text: preferences.projectId === project.id ? "Current Project" : "", icon: preferences.projectId === project.id ? Icon.Star : undefined }
                ]}
                detail={
                  <List.Item.Detail
                    markdown={`# ${project.name}\n\n**Project ID:** ${project.id}\n\n**Project Number:** ${project.projectNumber}\n\n**Created:** ${new Date(project.createTime).toLocaleString()}`}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Project Name" text={project.name} />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Project ID" text={project.id} />
                        <List.Item.Detail.Metadata.Label title="Project Number" text={project.projectNumber} />
                        <List.Item.Detail.Metadata.Label title="Created" text={new Date(project.createTime).toLocaleString()} />
                        {preferences.projectId === project.id && (
                          <>
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label 
                              title="Status" 
                              text="Current Project" 
                              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }} 
                            />
                          </>
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Project Actions">
                      <Action
                        title="Open Project"
                        icon={Icon.Forward}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                        onAction={() => viewProject(project.id)}
                      />
                      <Action
                        title="Set as Current Project"
                        icon={Icon.Check}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                        onAction={() => selectProject(project.id)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Services">
                      <Action
                        title="View Storage Buckets"
                        icon={Icon.Folder}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        onAction={() => viewStorageBuckets(project.id)}
                      />
                      <Action
                        title="View Storage Transfer Service"
                        icon={Icon.ArrowRight}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                        onAction={() => viewStorageTransfer(project.id)}
                      />
                      <Action
                        title="View Storage Statistics"
                        icon={Icon.BarChart}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                        onAction={() => viewStorageStats(project.id)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Utilities">
                      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => fetchProjects(false)} />
                      <Action title="Clear Cache" icon={Icon.Trash} onAction={clearCache} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
} 