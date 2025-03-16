import { ActionPanel, Action, List, Icon, useNavigation, showToast, Toast, Color, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { CacheManager, Project } from "../utils/CacheManager";
import ProjectView from "../ProjectView";
import { executeGcloudCommand } from "../gcloud";

interface CachedProjectViewProps {
  gcloudPath: string;
}

export default function CachedProjectView({ gcloudPath }: CachedProjectViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [cachedProject, setCachedProject] = useState<{ projectId: string; timestamp: number } | null>(null);
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { pop } = useNavigation();

  useEffect(() => {
    async function initialize() {
      // Get cached project
      const cached = CacheManager.getSelectedProject();
      setCachedProject(cached);

      if (cached) {
        try {
          // Try to get project details
          const result = await executeGcloudCommand(
            gcloudPath,
            `projects describe ${cached.projectId}`
          );
          if (result && result.length > 0) {
            setProjectDetails(result[0]);
          }
        } catch (error) {
          console.error("Error fetching cached project details:", error);
        }
      }

      // Get cached projects list
      const cachedProjects = CacheManager.getProjectsList();
      if (cachedProjects) {
        setProjects(cachedProjects.projects);
      }

      setIsLoading(false);
    }

    initialize();
  }, [gcloudPath]);

  function continueWithCachedProject() {
    if (cachedProject) {
      // Use the pop() navigation method to go back to the main view
      pop();
      // The main view will automatically navigate to the project view
    }
  }

  function selectNewProject() {
    // Clear the project cache
    CacheManager.clearProjectCache();
    
    // Go back to the main view
    pop();
  }

  function clearAllCache() {
    CacheManager.clearAllCaches();
    
    showToast({
      style: Toast.Style.Success,
      title: "Cache cleared",
      message: "All cached data has been cleared"
    });
    
    // Go back to the main view
    pop();
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
              <Action title="Try Again" icon={Icon.RotateClockwise} onAction={pop} />
              <Action title="Clear Cache" icon={Icon.Trash} onAction={clearAllCache} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!cachedProject) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView 
          title="No cached project found" 
          description="Please select a project"
          icon={{ source: Icon.Document, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Select Project" icon={Icon.Check} onAction={selectNewProject} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const projectName = projectDetails?.name || cachedProject.projectId;
  const lastUsed = new Date(cachedProject.timestamp).toLocaleString();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      navigationTitle="Cached Project"
    >
      <List.Section title="Cached Project">
        <List.Item
          title={projectName}
          subtitle={`Last used: ${lastUsed}`}
          icon={{ source: Icon.Clock, tintColor: Color.Blue }}
          accessories={[
            { text: cachedProject.projectId }
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Continue with this Project"
                icon={Icon.Forward}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={continueWithCachedProject}
              />
              <Action
                title="Select Different Project"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={selectNewProject}
              />
              <Action
                title="Clear Cache"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={clearAllCache}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      
      {projects.length > 0 && (
        <List.Section title="Recent Projects">
          {projects.slice(0, 5).map((project) => (
            <List.Item
              key={project.id}
              title={project.name}
              subtitle={project.id}
              icon={{ source: project.id === cachedProject.projectId ? Icon.CheckCircle : Icon.Circle, tintColor: project.id === cachedProject.projectId ? Color.Green : Color.SecondaryText }}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Project"
                    icon={Icon.Check}
                    onAction={() => {
                      CacheManager.saveSelectedProject(project.id);
                      pop();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
} 