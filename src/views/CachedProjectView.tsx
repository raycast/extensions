import { ActionPanel, Action, List, Icon, useNavigation, showToast, Toast, Color } from "@raycast/api";
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
  const [shouldNavigate, setShouldNavigate] = useState<{action: string; projectId?: string} | null>(null);
  const { pop, push } = useNavigation();

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

  // Handle navigation with useEffect
  useEffect(() => {
    if (!shouldNavigate) return;

    if (shouldNavigate.action === "continue" && cachedProject) {
      push(<ProjectView projectId={cachedProject.projectId} gcloudPath={gcloudPath} />);
    } else if (shouldNavigate.action === "select" && shouldNavigate.projectId) {
      CacheManager.saveSelectedProject(shouldNavigate.projectId);
      push(<ProjectView projectId={shouldNavigate.projectId} gcloudPath={gcloudPath} />);
    } else if (shouldNavigate.action === "new" || shouldNavigate.action === "clear") {
      if (shouldNavigate.action === "new") {
        CacheManager.clearProjectCache();
      } else if (shouldNavigate.action === "clear") {
        CacheManager.clearAllCaches();
        showToast({
          style: Toast.Style.Success,
          title: "Cache cleared",
          message: "All cached data has been cleared"
        });
      }
      pop();
    }

    // Reset navigation state
    setShouldNavigate(null);
  }, [shouldNavigate, cachedProject, gcloudPath, push, pop]);

  function continueWithCachedProject() {
    setShouldNavigate({ action: "continue" });
  }

  function selectNewProject() {
    setShouldNavigate({ action: "new" });
  }

  function clearAllCache() {
    setShouldNavigate({ action: "clear" });
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
              <Action title="Try Again" icon={Icon.RotateClockwise} onAction={() => setShouldNavigate({ action: "new" })} />
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
      navigationTitle="Welcome Back to Google Cloud"
    >
      <List.Section title="Quick Access" subtitle="Continue where you left off">
        <List.Item
          title="Continue with Last Project"
          subtitle={projectName}
          icon={{ source: Icon.ArrowRight, tintColor: Color.Green }}
          accessories={[
            { text: `Last used: ${lastUsed}`, icon: Icon.Clock },
            { text: cachedProject.projectId }
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open Project"
                icon={Icon.Forward}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={continueWithCachedProject}
              />
              <Action
                title="Browse All Projects"
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
        <List.Item
          title="Browse All Projects"
          subtitle="View and select from all your Google Cloud projects"
          icon={{ source: Icon.List, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Browse Projects"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                onAction={selectNewProject}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      
      {projects.length > 0 && (
        <List.Section title="Recent Projects" subtitle="Quick access to your recent projects">
          {projects.slice(0, 5).map((project) => (
            <List.Item
              key={project.id}
              title={project.name}
              subtitle={project.id}
              icon={{ source: project.id === cachedProject.projectId ? Icon.CheckCircle : Icon.Circle, tintColor: project.id === cachedProject.projectId ? Color.Green : Color.SecondaryText }}
              accessories={[
                { text: project.id === cachedProject.projectId ? "Current" : "", icon: project.id === cachedProject.projectId ? Icon.Star : undefined }
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Project"
                    icon={Icon.Forward}
                    onAction={() => setShouldNavigate({ action: "select", projectId: project.id })}
                  />
                  <Action
                    title="Browse All Projects"
                    icon={Icon.List}
                    onAction={selectNewProject}
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