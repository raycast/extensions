import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Fzf } from "fzf";
import { homedir } from "os";
import { useState } from "react";
import { getGitProjects } from "./git-projects";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { application } = getPreferenceValues<Preferences>();

  const { data: projects = [], isLoading } = useCachedPromise(async () => {
    return getGitProjects();
  });

  const filteredProjects = searchText
    ? searchText.split(/\s+/).reduce((results, word) => {
        return new Fzf(results).find(word).map((entry) => entry.item);
      }, projects)
    : projects;

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
    <List isLoading={isLoading} searchBarPlaceholder="Search git projects..." onSearchTextChange={setSearchText}>
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
