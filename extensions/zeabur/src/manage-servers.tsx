import { useState, useEffect } from "react";
import { List, Image, ActionPanel, Action, Icon, Color, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ServerInfo, ServerWithStatusInfo, ProjectInfo } from "./type";
import { getServers, getServerWithStatus, getProjects } from "./utils/zeabur-graphql";
import ZeaburTokenUndefined from "./components/zeabur-token-undefined";
import ProjectServices from "./components/project-services";

export default function Command() {
  const preferences = getPreferenceValues();
  const zeaburToken = preferences.zeaburToken;

  const [isLoading, setIsLoading] = useState(true);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [serverStatuses, setServerStatuses] = useState<ServerWithStatusInfo[]>([]);
  const [projectsWithServers, setProjectsWithServers] = useState<ProjectInfo[]>([]);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const servers = await getServers();
        setServers(servers);

        const serverStatuses = await Promise.all(servers.map((server) => getServerWithStatus(server._id)));
        setServerStatuses(serverStatuses);

        setIsLoading(false);
      } catch {
        showFailureToast("Failed to fetch servers");
        setIsLoading(false);
      }
    };

    const fetchProjects = async () => {
      const projects = await getProjects();
      const projectsWithServers = projects.filter((project) => project.region.id.includes("server"));
      setProjectsWithServers(projectsWithServers);
    };

    if (zeaburToken !== undefined && zeaburToken !== "") {
      fetchServers();
      fetchProjects();
    }
  }, [isReloading, zeaburToken]);

  if (zeaburToken === undefined || zeaburToken === "") {
    return <ZeaburTokenUndefined />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search servers">
      {servers.length > 0 ? (
        servers.map((server: ServerInfo) => {
          const serverStatus = serverStatuses.find((status) => status._id === server._id);
          const projects = projectsWithServers.filter((project) => project.region.id.includes(server._id));
          return (
            <List.Item
              key={server._id}
              title={server.name}
              icon={{
                source: server.providerInfo.icon === "" ? "extension-icon.png" : server.providerInfo.icon,
                fallback: "extension-icon.png",
                mask: Image.Mask.RoundedRectangle,
              }}
              accessories={[
                ...(serverStatus?.status
                  ? [
                      {
                        tag: {
                          value: serverStatus.status.isOnline ? "Online" : "Offline",
                          color: serverStatus.status.isOnline ? Color.Green : Color.Red,
                        },
                        tooltip: "Status",
                      },
                    ]
                  : []),
                ...(server.ip
                  ? [
                      {
                        tag: server.ip,
                        tooltip: "IP Address",
                      },
                    ]
                  : []),
                ...(server.continent
                  ? [
                      {
                        tag: `${server.city}, ${server.country}`,
                        tooltip: "Region",
                      },
                    ]
                  : []),
                ...(serverStatus?.status.totalCPU
                  ? [
                      {
                        tag: `${serverStatus.status.usedCPU}m / ${serverStatus.status.totalCPU}m`,
                        tooltip: "CPU Usage",
                      },
                    ]
                  : []),
                ...(serverStatus?.status.totalMemory
                  ? [
                      {
                        tag: `${serverStatus.status.usedMemory}m / ${serverStatus.status.totalMemory}m`,
                        tooltip: "Memory Usage",
                      },
                    ]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open Server Page" url={`https://zeabur.com/servers/${server._id}`} />
                  {projects && (
                    <ActionPanel.Submenu title="View Server Projects" icon={Icon.List}>
                      {projects.map((project) => (
                        <Action.Push
                          key={project._id}
                          title={project.name}
                          icon={{
                            source: project.iconURL === "" ? "extension-icon.png" : project.iconURL,
                            fallback: "extension-icon.png",
                            mask: Image.Mask.RoundedRectangle,
                          }}
                          target={
                            <ProjectServices projectID={project._id} environmentID={project.environments[0]._id} />
                          }
                        />
                      ))}
                    </ActionPanel.Submenu>
                  )}
                  <Action.OpenInBrowser title="Buy Server" url={`https://zeabur.com/servers/buy`} icon={Icon.Cart} />
                  <Action
                    title="Reload Servers Data"
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
          );
        })
      ) : (
        <List.EmptyView
          title="No servers found"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Buy Server" url={`https://zeabur.com/servers/buy`} icon={Icon.Cart} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
