import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, showToast, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { getGitProjects } from "./git-projects";
import { homedir } from "os";

export default function Command() {
  const [projects, setProjects] = useState<string[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { application, cacheTimeout } = getPreferenceValues<Preferences>();
  const cacheTimeoutSeconds = parseInt(cacheTimeout || "0", 0);

  useEffect(() => {
    async function fetchProjects() {
      try {
        if (isNaN(cacheTimeoutSeconds) || cacheTimeoutSeconds < 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid cache timeout",
            message: "Please enter a valid number (0 or greater) in preferences",
          });
          setIsLoading(false);
          return;
        }

        const projectList = await getGitProjects(cacheTimeoutSeconds);
        setProjects(projectList);
        setFilteredProjects(projectList);
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

  const onSearchTextChange = (searchText: string) => {
    if (!searchText) {
      setFilteredProjects(projects);
      return;
    }

    const filtered = projects.filter((project) => {
      const projectLower = project.toLowerCase();
      const searchTerms = searchText.toLowerCase().split(/\s+/).filter(Boolean);
      return searchTerms.every((term) => projectLower.includes(term));
    });
    setFilteredProjects(filtered);
  };

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
    <List isLoading={isLoading} searchBarPlaceholder="Search git projects..." onSearchTextChange={onSearchTextChange}>
      {filteredProjects.map((project) => (
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
