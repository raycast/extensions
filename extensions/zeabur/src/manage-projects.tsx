import { useState, useEffect, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Image,
  confirmAlert,
  showToast,
  Toast,
  Alert,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ProjectInfo } from "./type";
import { getProjects, getProjectUsage, deleteProject } from "./utils/zeabur-graphql";
import ProjectServices from "./components/project-services";

export default function Command() {
  const preferences = getPreferenceValues();
  const zeaburToken = preferences.zeaburToken;

  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [projectUsages, setProjectUsages] = useState<{ [key: string]: string }>({});
  const [isReloading, setIsReloading] = useState(false);
  const [sortBy, setSortBy] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projects = await getProjects();
        setProjects(projects);

        const usages: { [key: string]: string } = {};
        await Promise.all(
          projects.map(async (project) => {
            if (project.region.id.includes("server")) {
              usages[project._id] = "Free";
            } else {
              try {
                const usage = await getProjectUsage(project._id);
                usages[project._id] = "$" + usage.usages.reduce((acc, curr) => acc + curr.usage, 0).toFixed(2);
              } catch {
                usages[project._id] = "$0";
              }
            }
          }),
        );
        setProjectUsages(usages);

        setIsLoading(false);
      } catch {
        showFailureToast("Failed to fetch projects");
        setIsLoading(false);
      }
    };

    if (zeaburToken !== undefined && zeaburToken !== "") {
      fetchProjects();
    }
  }, [isReloading, zeaburToken]);

  const sortedProjects = useMemo(() => {
    if (sortBy === "") {
      return projects;
    }
    return [...projects].sort((a, b) => {
      if (sortBy === "createTime") {
        return a._id.localeCompare(b._id);
      } else if (sortBy === "projectName") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
  }, [sortBy, projects]);

  if (zeaburToken === undefined || zeaburToken === "") {
    return (
      <List
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      >
        <List.EmptyView icon={Icon.Key} title="Please set Zeabur Token in the extension preferences" />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" value={sortBy} onChange={setSortBy} storeValue={true}>
          <List.Dropdown.Item title="Create Time" value="createTime" />
          <List.Dropdown.Item title="Project Name" value="projectName" />
        </List.Dropdown>
      }
    >
      {sortedProjects.length > 0 ? (
        sortedProjects.map((project: ProjectInfo) => (
          <List.Item
            key={project._id}
            title={project.name}
            icon={{
              source: project.iconURL == "" ? "extension-icon.png" : project.iconURL,
              fallback: "extension-icon.png",
              mask: Image.Mask.RoundedRectangle,
            }}
            accessories={[
              ...(project.region.providerInfo?.code && projectUsages[project._id] !== undefined
                ? [
                    {
                      tag: projectUsages[project._id],
                      tooltip: "Usage",
                    },
                  ]
                : []),
              ...(project.region.providerInfo?.code
                ? [
                    {
                      tag: project.region.providerInfo.code,
                      tooltip: "Provider",
                    },
                  ]
                : []),
              ...(project.region.country
                ? [
                    {
                      tag: project.region.country,
                      tooltip: "Country",
                    },
                  ]
                : []),
              ...(project.region.city
                ? [
                    {
                      tag: project.region.city,
                      tooltip: "City",
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Services"
                  icon={Icon.List}
                  target={<ProjectServices projectID={project._id} environmentID={project.environments[0]._id} />}
                />
                <Action.OpenInBrowser title="Open Project Page" url={`https://zeabur.com/projects/${project._id}`} />
                <Action
                  title="Delete Project"
                  icon={Icon.Trash}
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: "d",
                  }}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Delete Project",
                        message: "Are you sure you want to delete this project?",
                        icon: Icon.Trash,
                        primaryAction: {
                          title: "Confirm",
                          style: Alert.ActionStyle.Destructive,
                        },
                      })
                    ) {
                      try {
                        const res = await deleteProject(project._id);
                        if (res) {
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Project deleted successfully",
                          });
                          setProjects(projects.filter((p) => p._id !== project._id));
                        } else {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to delete project",
                          });
                        }
                      } catch {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to delete project",
                        });
                      }
                    }
                  }}
                />
                <Action
                  title="Reload Projects Data"
                  icon={Icon.ArrowClockwise}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "r",
                  }}
                  onAction={() => {
                    setIsReloading(!isReloading);
                    setIsLoading(true);
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView title="No projects found" />
      )}
    </List>
  );
}
