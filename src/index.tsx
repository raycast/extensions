import { ActionPanel, Action, List, showToast, Toast, Icon, Form, useNavigation, Color } from "@raycast/api";
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

const execPromise = promisify(exec);
const GCLOUD_PATH = "/usr/local/bin/gcloud";

interface Preferences {
  projectId?: string;
}

interface Project {
  id: string;
  name: string;
  projectNumber: string;
  createTime: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({});
  const { push } = useNavigation();

  useEffect(() => {
    checkGcloudInstallation();
  }, []);

  async function checkGcloudInstallation() {
    try {
      await execPromise(`${GCLOUD_PATH} --version`);
      checkAuthStatus();
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

  async function checkAuthStatus() {
    setIsLoading(true);
    
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Checking authentication status...",
    });
    
    try {
      const { stdout } = await execPromise(`${GCLOUD_PATH} auth list --format="value(account)" --filter="status=ACTIVE"`);
      
      if (stdout.trim()) {
        setIsAuthenticated(true);
        loadingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "Authenticated",
          message: stdout.trim(),
        });
        fetchProjects();
      } else {
        setIsAuthenticated(false);
        setIsLoading(false);
        loadingToast.hide();
        showToast({
          style: Toast.Style.Failure,
          title: "Not authenticated",
          message: "Please authenticate with Google Cloud",
        });
      }
    } catch (error: any) {
      setIsAuthenticated(false);
      setIsLoading(false);
      setError(`Authentication check failed: ${error.message}`);
      loadingToast.hide();
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication check failed",
        message: error.message,
      });
    }
  }

  async function fetchProjects() {
    setIsLoading(true);
    
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading projects...",
    });
    
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
        
        try {
          const prefsPath = join(homedir(), '.raycast-gcloud-prefs.json');
          if (fs.existsSync(prefsPath)) {
            const prefsData = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
            setPreferences(prefsData);
          }
        } catch (e) {
          console.error("Failed to load preferences:", e);
        }
        
        loadingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "Projects loaded",
          message: `Found ${formattedProjects.length} projects`,
        });
      } else {
        setProjects([]);
        loadingToast.hide();
        showToast({
          style: Toast.Style.Failure,
          title: "No projects found",
          message: "Create a project in Google Cloud Console",
        });
      }
    } catch (error: any) {
      setError(`Failed to fetch projects: ${error.message}`);
      loadingToast.hide();
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch projects",
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function authenticate() {
    const authToast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting authentication...",
      message: "Please follow the instructions in your browser",
    });
    
    try {
      await execPromise(`${GCLOUD_PATH} auth login --no-launch-browser`);
      setIsAuthenticated(true);
      authToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Authentication successful",
      });
      fetchProjects();
    } catch (error: any) {
      authToast.hide();
      setError(`Authentication failed: ${error.message}`);
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication failed",
        message: error.message,
      });
    }
  }

  async function selectProject(projectId: string) {
    const selectingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Selecting project...",
      message: projectId,
    });
    
    try {
      await execPromise(`${GCLOUD_PATH} config set project ${projectId}`);
      
      // Save preference
      const prefsPath = join(homedir(), '.raycast-gcloud-prefs.json');
      fs.writeFileSync(prefsPath, JSON.stringify({ projectId }));
      setPreferences({ projectId });
      
      selectingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Project selected",
        message: projectId,
      });
      
      push(<ProjectView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
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

  function viewStorageBuckets(projectId: string) {
    push(<StorageBucketView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
  }

  function viewStorageTransfer(projectId: string) {
    push(<StorageTransferView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
  }

  function viewStorageStats(projectId: string) {
    push(<StorageStatsView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
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
            </ActionPanel>
          }
        />
      </List>
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
          <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={fetchProjects} />
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
        <List.Section title="Google Cloud Projects" subtitle={`${projects.length} projects`}>
          {projects.map((project) => (
            <List.Item
              key={project.id}
              title={project.name}
              subtitle=""
              icon={{ source: preferences.projectId === project.id ? Icon.CheckCircle : Icon.Circle, tintColor: preferences.projectId === project.id ? Color.Green : Color.SecondaryText }}
              accessories={[]}
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
                  <Action
                    title="Select Project"
                    icon={Icon.Check}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={() => selectProject(project.id)}
                  />
                  <Action
                    title="View Project Dashboard"
                    icon={Icon.Eye}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => push(<ProjectView projectId={project.id} gcloudPath={GCLOUD_PATH} />)}
                  />
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
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchProjects} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
} 