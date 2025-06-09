import { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  Icon,
  List,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  LaunchType,
} from "@raycast/api";
import { EditorManager } from "./services/EditorManager";
import { ConnectionTestService } from "./services/ConnectionTestService";
import { MCPServerWithMetadata, EditorType } from "./types/mcpServer";
import { getEditorConfig, SUCCESS_MESSAGES } from "./utils/constants";
import AddServerForm from "./add-mcp-server";
import { EditServerForm } from "./edit-mcp-server";
import { validateAllConfigurations } from "./utils/validateAllConfigurations";
import ServerDetails from "./server-details";
import TestServerConnection from "./test-server-connection";
import {
  unlockServer,
  lockServer,
  isDefaultProtectedServer,
} from "./utils/protectedServers";
import { getTransportType } from "./utils/transportUtils";

type EditorFilter = "all" | EditorType;

export default function Command() {
  const [servers, setServers] = useState<MCPServerWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editorFilter, setEditorFilter] = useState<EditorFilter>("all");
  const [editorManager] = useState(() => new EditorManager());
  const [connectionTestService] = useState(() => new ConnectionTestService());
  const [protectionRefreshKey, setProtectionRefreshKey] = useState(0);
  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    loadServers();
  }, [editorFilter]);

  async function loadServers() {
    try {
      setIsLoading(true);
      const allServers = await editorManager.readAllServers();

      const { isProtectedServer, isServerUnlocked } = await import(
        "./utils/protectedServers"
      );
      const serversWithProtection = await Promise.all(
        allServers.map(async (server) => {
          try {
            const [isProtected, isUnlocked] = await Promise.all([
              isProtectedServer(server.config.name, server.editor),
              isServerUnlocked(server.config.name, server.editor),
            ]);
            return { ...server, isProtected, isUnlocked };
          } catch (error) {
            console.error(
              `Failed to load protection status for ${server.config.name}:`,
              error,
            );
            return { ...server, isProtected: false, isUnlocked: false };
          }
        }),
      );

      setServers(serversWithProtection);
    } catch (error) {
      console.error("Failed to load servers:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load servers",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredServers =
    editorFilter === "all"
      ? servers
      : servers.filter((server) => server.editor === editorFilter);

  const serversByEditor = servers.reduce(
    (acc, server) => {
      if (!acc[server.editor]) {
        acc[server.editor] = [];
      }
      acc[server.editor].push(server);
      return acc;
    },
    {} as Record<EditorType, MCPServerWithMetadata[]>,
  );

  async function toggleServer(server: MCPServerWithMetadata) {
    try {
      const wasDisabled = server.config.disabled;

      await editorManager.toggleServer(
        server.editor,
        server.config.name,
        server.source,
      );

      await showToast({
        style: Toast.Style.Success,
        title: wasDisabled
          ? SUCCESS_MESSAGES.SERVER_ENABLED
          : SUCCESS_MESSAGES.SERVER_DISABLED,
      });

      await loadServers();
    } catch (error) {
      console.error("Failed to toggle server:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle server",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function deleteServer(server: MCPServerWithMetadata) {
    const confirmed = await confirmAlert({
      title: "Delete Server",
      message: `Are you sure you want to delete "${server.config.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (confirmed) {
      try {
        await editorManager.deleteServer(
          server.editor,
          server.config.name,
          server.source,
        );
        await showToast({
          style: Toast.Style.Success,
          title: SUCCESS_MESSAGES.SERVER_DELETED,
        });
        await loadServers();
      } catch (error) {
        console.error("Failed to delete server:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete server",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async function toggleServerLock(server: MCPServerWithMetadata) {
    try {
      const { isProtectedServer, isServerUnlocked } = await import(
        "./utils/protectedServers"
      );

      const isCurrentlyProtected = await isProtectedServer(
        server.config.name,
        server.editor,
      );
      const isCurrentlyUnlocked = await isServerUnlocked(
        server.config.name,
        server.editor,
      );
      const isCurrentlyLocked = isCurrentlyProtected && !isCurrentlyUnlocked;

      if (isCurrentlyLocked) {
        if (isDefaultProtectedServer(server.config.name)) {
          await unlockServer(server.config.name, server.editor);
        } else {
          const { unlockUserLockedServer } = await import(
            "./utils/protectedServers"
          );
          await unlockUserLockedServer(server.config.name, server.editor);
        }
        await showToast({
          style: Toast.Style.Success,
          title: "Server Unlocked",
          message: `${server.config.name} can now be edited`,
        });
      } else {
        await lockServer(server.config.name, server.editor);
        await showToast({
          style: Toast.Style.Success,
          title: "Server Locked",
          message: `${server.config.name} is now protected from editing`,
        });
      }

      await loadServers();
      setProtectionRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to toggle server lock:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle server lock",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function testConnection(server: MCPServerWithMetadata) {
    const testDescription = connectionTestService.getTestDescription(
      server.config,
    );

    await showToast({
      style: Toast.Style.Animated,
      title: "Testing connection...",
      message: testDescription,
    });

    try {
      const result = await connectionTestService.testConnection(server.config);

      if (result.success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Connection test successful",
          message: `${result.message} (${result.responseTime}ms)`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Connection test failed",
          message: result.error || result.message,
        });
      }

      server.lastTestResult = result;
    } catch (error) {
      console.error("Connection test error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection test failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const list = (
    <List
      isLoading={isLoading}
      navigationTitle={
        editorFilter === "all"
          ? undefined
          : `${getEditorConfig(editorFilter).displayName} Servers`
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Editor"
          value={editorFilter}
          onChange={(newValue) => setEditorFilter(newValue as EditorFilter)}
        >
          <List.Dropdown.Item title="All Editors" value="all" />
          <List.Dropdown.Section title="Editors">
            {editorManager.getAvailableEditors().map((editor) => {
              const config = getEditorConfig(editor);
              return (
                <List.Dropdown.Item
                  key={editor}
                  title={config.displayName}
                  value={editor}
                />
              );
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Add Server"
              icon={Icon.Plus}
              target={<AddServerForm />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={loadServers}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.Push
              title="Test All Connections"
              icon={Icon.Network}
              target={<TestServerConnection />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
            <Action
              title="Validate All Configurations"
              icon={Icon.MagnifyingGlass}
              onAction={() => validateAllConfigurations()}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {editorFilter === "all"
        ? Object.entries(serversByEditor).map(([editor, editorServers]) => (
            <List.Section
              key={editor}
              title={getEditorConfig(editor as EditorType).displayName}
              subtitle={`${editorServers.length} server${editorServers.length !== 1 ? "s" : ""}`}
            >
              {editorServers.map((server) => (
                <ServerListItem
                  key={`${server.editor}-${server.config.name}`}
                  server={server}
                  onToggle={() => toggleServer(server)}
                  onDelete={() => deleteServer(server)}
                  onTest={() => testConnection(server)}
                  onToggleLock={() => toggleServerLock(server)}
                  onRefresh={loadServers}
                  protectionRefreshKey={protectionRefreshKey}
                />
              ))}
            </List.Section>
          ))
        : filteredServers.map((server) => (
            <ServerListItem
              key={`${server.editor}-${server.config.name}`}
              server={server}
              onToggle={() => toggleServer(server)}
              onDelete={() => deleteServer(server)}
              onTest={() => testConnection(server)}
              onToggleLock={() => toggleServerLock(server)}
              onRefresh={loadServers}
              protectionRefreshKey={protectionRefreshKey}
            />
          ))}

      {(editorFilter === "all" ? servers : filteredServers).length === 0 &&
        !isLoading && (
          <List.EmptyView
            icon={Icon.Gear}
            title={
              editorFilter === "all"
                ? "No MCP Servers Found"
                : `No ${getEditorConfig(editorFilter).displayName} Servers Found`
            }
            description={
              editorFilter === "all"
                ? "Add your first MCP server to get started"
                : `Add your first ${getEditorConfig(editorFilter).displayName} MCP server to get started`
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Server"
                  icon={Icon.Plus}
                  target={<AddServerForm />}
                />
              </ActionPanel>
            }
          />
        )}
    </List>
  );

  return list;
}

function ServerListItem({
  server,
  onToggle,
  onDelete,
  onTest,
  onToggleLock,
  onRefresh,
  protectionRefreshKey,
}: {
  server: MCPServerWithMetadata & {
    isProtected?: boolean;
    isUnlocked?: boolean;
  };
  onToggle: () => void;
  onDelete: () => void;
  onTest: () => void;
  onToggleLock: () => void;
  onRefresh: () => void;
  protectionRefreshKey: number;
}) {
  const [isProtected, setIsProtected] = useState(server.isProtected || false);
  const [isUnlocked, setIsUnlocked] = useState(server.isUnlocked || false);

  useEffect(() => {
    async function loadProtectionState() {
      try {
        const { isProtectedServer, isServerUnlocked } = await import(
          "./utils/protectedServers"
        );
        const [isServerProtected, isServerUnlockedResult] = await Promise.all([
          isProtectedServer(server.config.name, server.editor),
          isServerUnlocked(server.config.name, server.editor),
        ]);
        setIsProtected(isServerProtected);
        setIsUnlocked(isServerUnlockedResult);
      } catch (error) {
        console.error(
          "Failed to load protection state for server:",
          server.config.name,
          error,
        );
      }
    }
    loadProtectionState();
  }, [server.config.name, server.editor, protectionRefreshKey]);

  const isLocked = isProtected && !isUnlocked;

  const getTransportIcon = (transport: string) => {
    switch (transport) {
      case "stdio":
        return Icon.Terminal;
      case "sse":
      case "/sse":
        return Icon.Globe;
      case "http":
        return Icon.Network;
      default:
        return Icon.Gear;
    }
  };

  const getStatusDisplay = () => {
    const statusParts = [];

    if (server.editor === "cursor") {
      statusParts.push({
        text: "Enabled",
        icon: Icon.CheckCircle,
        color: Color.Green,
        tooltip: "Server state is managed through Cursor's MCP settings",
      });
    } else if (server.config.disabled === true) {
      statusParts.push({
        text: "Disabled",
        icon: Icon.XMarkCircle,
        color: Color.Red,
        tooltip: "Server is disabled",
      });
    } else if (server.config.disabled === false) {
      statusParts.push({
        text: "Enabled",
        icon: Icon.CheckCircle,
        color: Color.Green,
        tooltip: "Server is enabled",
      });
    } else {
      statusParts.push({
        text: "Enabled",
        icon: Icon.CheckCircle,
        color: Color.Green,
        tooltip: "Server status unknown",
      });
    }

    if (isProtected && isLocked) {
      statusParts.push({
        text: "Protected",
        icon: Icon.Lock,
        color: Color.SecondaryText,
        tooltip:
          "This server is protected from editing. Click unlock to modify.",
      });
    }

    return statusParts;
  };

  const statusDisplays = getStatusDisplay();
  const primaryStatus = statusDisplays[0];

  return (
    <List.Item
      icon={{
        source: primaryStatus.icon,
        tintColor: primaryStatus.color,
      }}
      title={server.config.name}
      subtitle={server.config.description || undefined}
      accessories={[
        {
          text: getTransportType(server.config).toUpperCase() || "UNKNOWN",
          icon: {
            source: getTransportIcon(getTransportType(server.config) || ""),
          },
        },
        ...statusDisplays.map((status) => ({
          text: {
            value: status.text,
            color: status.color,
          },
          icon: {
            source: status.icon,
            tintColor: status.color,
          },
          tooltip: status.tooltip,
        })),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={
                <ServerDetails
                  arguments={{
                    editorType: server.editor,
                    serverName: server.config.name,
                    configType: server.source as
                      | "global"
                      | "workspace"
                      | "user",
                  }}
                  launchType={LaunchType.UserInitiated}
                />
              }
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            <Action
              title={isLocked ? "Unlock Server" : "Lock Server"}
              icon={isLocked ? Icon.LockUnlocked : Icon.Lock}
              onAction={onToggleLock}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
            {!isLocked && (
              <Action.Push
                title="Edit Server"
                icon={Icon.Pencil}
                target={
                  <EditServerForm
                    editorType={server.editor}
                    serverName={server.config.name}
                    configType={server.source}
                    onComplete={onRefresh}
                  />
                }
              />
            )}
            {!isLocked && server.editor !== "cursor" && (
              <Action
                title={
                  server.config.disabled ? "Enable Server" : "Disable Server"
                }
                icon={server.config.disabled ? Icon.Play : Icon.Pause}
                onAction={onToggle}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            )}
            <Action
              title="Test Connection"
              icon={Icon.Network}
              onAction={onTest}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Server Name"
              content={server.config.name}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Configuration"
              content={JSON.stringify(server.config, null, 2)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {!isLocked && (
              <Action
                title="Delete Server"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={onDelete}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
