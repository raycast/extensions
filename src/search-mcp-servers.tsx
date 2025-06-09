import { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  LaunchType,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { EditorManager } from "./services/EditorManager";
import { ConnectionTestService } from "./services/ConnectionTestService";
import { MCPServerWithMetadata } from "./types/mcpServer";
import { getEditorConfig, SUCCESS_MESSAGES } from "./utils/constants";
import { EditServerForm } from "./edit-mcp-server";
import AddServerForm from "./add-mcp-server";
import ServerDetails from "./server-details";
import ListServers from "./list-mcp-servers";
import TestServerConnection from "./test-server-connection";
import { validateAllConfigurations } from "./utils/validateAllConfigurations";
import { unlockServer, lockServer, isDefaultProtectedServer } from "./utils/protectedServers";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [servers, setServers] = useState<MCPServerWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editorManager] = useState(() => new EditorManager());
  const [connectionTestService] = useState(() => new ConnectionTestService());
  const [protectionRefreshKey, setProtectionRefreshKey] = useState(0);

  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    if (searchText.trim()) {
      loadServers();
    }
  }, [searchText]);

  async function loadServers() {
    try {
      setIsLoading(true);
      const allServers = await editorManager.readAllServers();

      const { isProtectedServer, isServerUnlocked } = await import("./utils/protectedServers");
      const serversWithProtection = await Promise.all(
        allServers.map(async (server) => {
          try {
            const [isProtected, isUnlocked] = await Promise.all([
              isProtectedServer(server.config.name, server.editor),
              isServerUnlocked(server.config.name, server.editor),
            ]);
            return { ...server, isProtected, isUnlocked };
          } catch (error) {
            console.error("Failed to load protection status for server:", server.config.name, error);
            return { ...server, isProtected: false, isUnlocked: false };
          }
        }),
      );

      setServers(serversWithProtection);
    } catch (error) {
      console.error("Failed to load servers for search:", error);
      setServers([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleServer(server: MCPServerWithMetadata) {
    try {
      const wasDisabled = server.config.disabled;

      await editorManager.toggleServer(server.editor, server.config.name, server.source);

      await showToast({
        style: Toast.Style.Success,
        title: wasDisabled ? SUCCESS_MESSAGES.SERVER_ENABLED : SUCCESS_MESSAGES.SERVER_DISABLED,
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
        await editorManager.deleteServer(server.editor, server.config.name, server.source);
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

  async function toggleServerLock(server: MCPServerWithMetadata & { isProtected?: boolean; isUnlocked?: boolean }) {
    try {
      const { isProtectedServer, isServerUnlocked } = await import("./utils/protectedServers");

      const isCurrentlyProtected = await isProtectedServer(server.config.name, server.editor);
      const isCurrentlyUnlocked = await isServerUnlocked(server.config.name, server.editor);
      const isCurrentlyLocked = isCurrentlyProtected && !isCurrentlyUnlocked;

      if (isCurrentlyLocked) {
        if (isDefaultProtectedServer(server.config.name)) {
          await unlockServer(server.config.name, server.editor);
        } else {
          const { unlockUserLockedServer } = await import("./utils/protectedServers");
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
    const testDescription = connectionTestService.getTestDescription(server.config);

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

  const filteredServers = servers.filter((server) => {
    if (!searchText.trim()) return true;

    const query = searchText.toLowerCase();
    const config = server.config;

    if (
      config.name.toLowerCase().includes(query) ||
      (config.description && config.description.toLowerCase().includes(query)) ||
      (config.transport && config.transport.toLowerCase().includes(query)) ||
      server.editor.toLowerCase().includes(query)
    ) {
      return true;
    }

    if ("url" in config && config.url && config.url.toLowerCase().includes(query)) {
      return true;
    }
    if ("serverUrl" in config && config.serverUrl && config.serverUrl.toLowerCase().includes(query)) {
      return true;
    }

    if ("command" in config && config.command && config.command.toLowerCase().includes(query)) {
      return true;
    }
    if ("args" in config && config.args && Array.isArray(config.args)) {
      if (config.args.some((arg) => arg.toLowerCase().includes(query))) {
        return true;
      }
    }

    if ("env" in config && config.env && typeof config.env === "object") {
      const envEntries = Object.entries(config.env);
      if (
        envEntries.some(
          ([key, value]) => key.toLowerCase().includes(query) || String(value).toLowerCase().includes(query),
        )
      ) {
        return true;
      }
    }

    if ("envFile" in config && config.envFile && config.envFile.toLowerCase().includes(query)) {
      return true;
    }
    if ("roots" in config && config.roots && Array.isArray(config.roots)) {
      if (config.roots.some((root) => root.toLowerCase().includes(query))) {
        return true;
      }
    }

    if ("headers" in config && config.headers && typeof config.headers === "object") {
      const headerEntries = Object.entries(config.headers);
      if (
        headerEntries.some(
          ([key, value]) => key.toLowerCase().includes(query) || String(value).toLowerCase().includes(query),
        )
      ) {
        return true;
      }
    }

    if (server.source && server.source.toLowerCase().includes(query)) {
      return true;
    }

    return false;
  });

  const serversByEditor = filteredServers.reduce(
    (acc, server) => {
      if (!acc[server.editor]) {
        acc[server.editor] = [];
      }
      acc[server.editor].push(server);
      return acc;
    },
    {} as Record<string, MCPServerWithMetadata[]>,
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search servers by name, description, transport, URL, command, args, env vars, and more..."
      searchText={searchText}
      throttle
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
            <Action.Push
              title="View All Servers"
              icon={Icon.List}
              target={<ListServers />}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
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
      <List.Section
        title="Search Results"
        subtitle={`${filteredServers.length} server${filteredServers.length !== 1 ? "s" : ""} found`}
      >
        {Object.entries(serversByEditor).map(([, editorServers]) =>
          editorServers.map((server) => (
            <SearchResultItem
              key={`${server.editor}-${server.config.name}`}
              server={server}
              onToggle={() => toggleServer(server)}
              onDelete={() => deleteServer(server)}
              onTest={() => testConnection(server)}
              onToggleLock={() => toggleServerLock(server)}
              onRefresh={loadServers}
              protectionRefreshKey={protectionRefreshKey}
            />
          )),
        )}
      </List.Section>

      {filteredServers.length === 0 && searchText.trim() && !isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No servers found"
          description={`No MCP servers match "${searchText}"`}
        />
      )}

      {filteredServers.length === 0 && !searchText.trim() && !isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search MCP Servers"
          description="Type to search across all your MCP servers"
          actions={
            <ActionPanel>
              <Action.Push title="Add Server" icon={Icon.Plus} target={<AddServerForm />} />
              <Action.Push title="View All Servers" icon={Icon.List} target={<ListServers />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function SearchResultItem({
  server,
  onToggle,
  onDelete,
  onTest,
  onToggleLock,
  onRefresh,
  protectionRefreshKey,
}: {
  server: MCPServerWithMetadata & { isProtected?: boolean; isUnlocked?: boolean };
  onToggle: () => void;
  onDelete: () => void;
  onTest: () => void;
  onToggleLock: () => void;
  onRefresh: () => void;
  protectionRefreshKey: number;
}) {
  const editorConfig = getEditorConfig(server.editor);
  const [protectionState, setProtectionState] = useState({
    isProtected: server.isProtected ?? false,
    isUnlocked: server.isUnlocked ?? false,
  });

  useEffect(() => {
    async function loadProtectionState() {
      try {
        const { isProtectedServer, isServerUnlocked } = await import("./utils/protectedServers");
        const [isServerProtected, isServerUnlockedResult] = await Promise.all([
          isProtectedServer(server.config.name, server.editor),
          isServerUnlocked(server.config.name, server.editor),
        ]);
        setProtectionState({
          isProtected: isServerProtected,
          isUnlocked: isServerUnlockedResult,
        });
      } catch (error) {
        console.error("Failed to load protection state for server:", server.config.name, error);
      }
    }
    loadProtectionState();
  }, [server.config.name, server.editor, protectionRefreshKey]);

  const { isProtected, isUnlocked } = protectionState;
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
        tooltip: "This server is protected from editing. Click unlock to modify.",
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
      accessories={[
        {
          text: editorConfig.displayName,
          icon: {
            source: editorConfig.icon,
            tintColor: Color.PrimaryText,
          },
          tooltip: `${editorConfig.displayName} server`,
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
        {
          text: server.config.transport?.toUpperCase() || "UNKNOWN",
          icon: {
            source: getTransportIcon(server.config.transport || ""),
            tintColor: Color.SecondaryText,
          },
        },
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
                    configType: server.source as "global" | "workspace" | "user",
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
                    configType={server.source as "global" | "workspace" | "user"}
                    onComplete={onRefresh}
                  />
                }
              />
            )}
            {!isLocked && server.editor !== "cursor" && (
              <Action
                title={server.config.disabled ? "Enable Server" : "Disable Server"}
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
            <Action.Push
              title="View All Servers"
              icon={Icon.List}
              target={<ListServers />}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
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

          <ActionPanel.Section title="Copy Specific Fields">
            {"command" in server.config && server.config.command && (
              <Action.CopyToClipboard
                title="Copy Command"
                content={server.config.command}
                shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              />
            )}
            {"url" in server.config && server.config.url && (
              <Action.CopyToClipboard
                title="Copy URL"
                content={server.config.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />
            )}
            {"serverUrl" in server.config && server.config.serverUrl && (
              <Action.CopyToClipboard
                title="Copy Server URL"
                content={(server.config as { serverUrl: string }).serverUrl}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              />
            )}
            {"args" in server.config &&
              server.config.args &&
              Array.isArray(server.config.args) &&
              server.config.args.length > 0 && (
                <Action.CopyToClipboard
                  title="Copy Arguments"
                  content={server.config.args.join("\n")}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
              )}
            {"env" in server.config &&
              server.config.env &&
              typeof server.config.env === "object" &&
              Object.keys(server.config.env).length > 0 && (
                <Action.CopyToClipboard
                  title="Copy Environment Variables"
                  content={Object.entries(server.config.env)
                    .map(([k, v]) => `${k}=${v}`)
                    .join("\n")}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
              )}
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
