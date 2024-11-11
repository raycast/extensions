import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, showToast, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { getGitProjects } from "./git-projects";
import { Preferences } from "./types";
import { homedir } from "os";

export default function Command() {
  const [projects, setProjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { application, cacheTimeout } = getPreferenceValues<Preferences>();
  const cacheTimeoutSeconds = parseInt(cacheTimeout || "0", 0);

  if (isNaN(cacheTimeoutSeconds) || cacheTimeoutSeconds < 0) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid cache timeout",
      message: "Please enter a valid number (0 or greater) in preferences",
    });
    return null;
  }

  useEffect(() => {
    async function fetchProjects() {
      try {
        const projectList = await getGitProjects(cacheTimeoutSeconds);
        setProjects(projectList);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load projects",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjects();
  }, []);

  async function openProject(projectPath: string) {
    try {
      const fullPath = projectPath.startsWith("~") ? projectPath.replace("~", homedir()) : projectPath;
      await open(fullPath, application);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open project",
        message: String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search git projects...">
      {projects.map((project) => (
        <List.Item
          key={project}
          icon={Icon.Folder}
          title={project.split("/").pop() || ""}
          subtitle={project}
          actions={
            <ActionPanel>
              <Action title="Open Project" onAction={() => openProject(project)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
