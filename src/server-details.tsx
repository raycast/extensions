import { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  Icon,
  Detail,
  showToast,
  Toast,
  LaunchProps,
  Color,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { EditorManager } from "./services/EditorManager";
import { ConnectionTestService } from "./services/ConnectionTestService";
import {
  MCPServerWithMetadata,
  EditorType,
  ConnectionTestResult,
  VSCodeMCPServerConfig,
  StdioTransportConfig,
  BaseMCPServerConfig,
  SSETransportConfig,
  HTTPTransportConfig,
  WindsurfSSETransportConfig,
} from "./types/mcpServer";
import { getEditorConfig, SUCCESS_MESSAGES } from "./utils/constants";
import { EditServerForm } from "./edit-mcp-server";
import {
  RawConfigEditForm,
  RawConfigHelpScreen,
} from "./components/RawConfigEditor";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import {
  isProtectedServer,
  validateLockedServersPresent,
} from "./utils/protectedServers";
import { getTransportType } from "./utils/transportUtils";

interface ServerDetailsArguments {
  editorType: EditorType;
  serverName: string;
  configType?: "global" | "workspace" | "user";
}

export default function Command({
  arguments: args,
}: LaunchProps<{ arguments: ServerDetailsArguments }>) {
  const [server, setServer] = useState<MCPServerWithMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(
    null,
  );
  const [editorManager] = useState(() => new EditorManager());
  const [connectionTestService] = useState(() => new ConnectionTestService());
  const [isProtected, setIsProtected] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(true);

  useEffect(() => {
    loadServerDetails();
  }, []);

  async function loadServerDetails() {
    try {
      setIsLoading(true);

      const allServers = await editorManager.readAllServers();
      const targetServer = allServers.find(
        (s) =>
          s.editor === args.editorType &&
          s.config.name === args.serverName &&
          (!args.configType || s.source === args.configType),
      );

      if (!targetServer) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Server not found",
          message: `Could not find server "${args.serverName}" in ${args.editorType}`,
        });
        return;
      }

      setServer(targetServer);

      const [protectedStatus, unlockedServers] = await Promise.all([
        isProtectedServer(targetServer.config.name, targetServer.editor),
        import("./utils/protectedServers").then((m) =>
          m.getUnlockedServers(targetServer.editor),
        ),
      ]);

      setIsProtected(protectedStatus);
      setIsUnlocked(
        !protectedStatus || unlockedServers.includes(targetServer.config.name),
      );
    } catch (error) {
      console.error("Failed to load server details:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load server details",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function removeServer() {
    if (!server) return;

    if (isProtected && !isUnlocked) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot remove protected server",
        message: `${server.config.name} is protected. Please unlock it first before removing.`,
      });
      return;
    }

    const currentServers = await editorManager.readAllServers();
    const currentEditorServers = currentServers.filter(
      (s) => s.editor === server.editor,
    );
    const currentServerNames = currentEditorServers.map((s) => s.config.name);
    const remainingServerNames = currentEditorServers
      .filter((s) => s.config.name !== server.config.name)
      .map((s) => s.config.name);

    const validation = await validateLockedServersPresent(
      remainingServerNames,
      server.editor,
      currentServerNames,
    );
    if (!validation.isValid) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot remove server",
        message: validation.message,
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: `Remove ${server.config.name}?`,
      message: `This will permanently remove the MCP server "${server.config.name}" from your ${getEditorConfig(server.editor).displayName} configuration.`,
      primaryAction: {
        title: "Remove",
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
          message: `${server.config.name} removed from ${getEditorConfig(server.editor).displayName}`,
        });
      } catch (error) {
        console.error("Failed to remove server:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to remove server",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async function testConnection() {
    if (!server) return;

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
      setTestResult(result);

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
    } catch (error) {
      console.error("Connection test error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection test failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (isLoading) {
    return (
      <Detail isLoading={true} navigationTitle="Loading Server Details..." />
    );
  }

  if (!server) {
    return (
      <Detail
        markdown="# Server Not Found\n\nThe requested server could not be found."
        navigationTitle="Server Not Found"
      />
    );
  }

  const editorConfig = getEditorConfig(server.editor);
  const config = server.config;
  const transportType = getTransportType(config);

  const markdown = `\`\`\`json
${JSON.stringify(config, null, 2)}
\`\`\``;
  const getStatusDisplay = () => {
    if (config.disabled) {
      return { text: "Disabled", icon: Icon.XMarkCircle, color: Color.Red };
    } else {
      return { text: "Enabled", icon: Icon.CheckCircle, color: Color.Green };
    }
  };

  const statusDisplay = getStatusDisplay();

  const getTestResultDisplay = () => {
    if (!testResult) {
      return {
        text: "Not tested",
        icon: Icon.QuestionMark,
        color: Color.SecondaryText,
      };
    }
    if (testResult.success) {
      return {
        text: `Success (${testResult.responseTime}ms)`,
        icon: Icon.CheckCircle,
        color: Color.Green,
      };
    } else {
      return { text: "Failed", icon: Icon.XMarkCircle, color: Color.Red };
    }
  };

  const testResultDisplay = getTestResultDisplay();

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${config.name} • ${editorConfig.displayName}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Server Name" text={config.name} />
          <Detail.Metadata.Label
            title="Editor"
            text={editorConfig.displayName}
            icon={{ source: editorConfig.icon, tintColor: Color.PrimaryText }}
          />
          <Detail.Metadata.Label
            title="Status"
            text={{
              value: statusDisplay.text,
              color: statusDisplay.color,
            }}
            icon={statusDisplay.icon}
          />
          <Detail.Metadata.Label
            title="Source"
            text={
              server.source === "global"
                ? "Global Configuration"
                : server.source === "workspace"
                  ? "Workspace Configuration"
                  : "User Configuration"
            }
          />
          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Transport"
            text={transportType.toUpperCase() || "Unknown"}
          />

          {transportType === "stdio" && (
            <>
              <Detail.Metadata.Label
                title="Command"
                text={
                  (config as StdioTransportConfig & BaseMCPServerConfig)
                    .command || "Not specified"
                }
              />
              {(config as StdioTransportConfig & BaseMCPServerConfig).args &&
                (config as StdioTransportConfig & BaseMCPServerConfig).args!
                  .length > 0 && (
                  <>
                    <Detail.Metadata.Label
                      title="Arguments"
                      text={`${(config as StdioTransportConfig & BaseMCPServerConfig).args!.length} argument${(config as StdioTransportConfig & BaseMCPServerConfig).args!.length !== 1 ? "s" : ""}`}
                    />
                    {(
                      config as StdioTransportConfig & BaseMCPServerConfig
                    ).args!.map((arg, index) => (
                      <Detail.Metadata.Label
                        key={index}
                        title={`  [${index}]`}
                        text={arg}
                      />
                    ))}
                  </>
                )}
            </>
          )}

          {transportType === "sse" && (
            <Detail.Metadata.Label
              title="URL"
              text={
                (config as SSETransportConfig & BaseMCPServerConfig).url ||
                "Not specified"
              }
            />
          )}

          {transportType === "http" && (
            <Detail.Metadata.Label
              title="URL"
              text={
                (config as HTTPTransportConfig & BaseMCPServerConfig).url ||
                "Not specified"
              }
            />
          )}

          {transportType === "/sse" && (
            <Detail.Metadata.Label
              title="Server URL"
              text={
                (config as WindsurfSSETransportConfig & BaseMCPServerConfig)
                  .serverUrl || "Not specified"
              }
            />
          )}

          {(config.description ||
            (transportType === "stdio" &&
              (config as StdioTransportConfig & BaseMCPServerConfig).env &&
              Object.keys(
                (config as StdioTransportConfig & BaseMCPServerConfig).env!,
              ).length > 0) ||
            (server.editor === "vscode" &&
              ((config as VSCodeMCPServerConfig).envFile ||
                ((config as VSCodeMCPServerConfig).roots &&
                  (config as VSCodeMCPServerConfig).roots!.length > 0)))) && (
            <Detail.Metadata.Separator />
          )}

          {config.description && (
            <Detail.Metadata.Label
              title="Description"
              text={config.description}
            />
          )}

          {(() => {
            if (transportType !== "stdio") return null;
            const stdioConfig = config as StdioTransportConfig &
              BaseMCPServerConfig;
            if (!stdioConfig.env || Object.keys(stdioConfig.env).length === 0)
              return null;

            return (
              <>
                <Detail.Metadata.Label
                  title="Environment Variables"
                  text={`${Object.keys(stdioConfig.env).length} variable${Object.keys(stdioConfig.env).length !== 1 ? "s" : ""}`}
                />
                {Object.entries(stdioConfig.env)
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <Detail.Metadata.Label
                      key={key}
                      title={key}
                      text={String(value)}
                    />
                  ))}
                {Object.keys(stdioConfig.env).length > 3 && (
                  <Detail.Metadata.Label
                    title="..."
                    text={`${Object.keys(stdioConfig.env).length - 3} more`}
                  />
                )}
              </>
            );
          })()}

          {server.editor === "vscode" && (
            <>
              {(config as VSCodeMCPServerConfig).envFile && (
                <Detail.Metadata.Label
                  title="Environment File"
                  text={(config as VSCodeMCPServerConfig).envFile}
                />
              )}
              {(config as VSCodeMCPServerConfig).roots &&
                (config as VSCodeMCPServerConfig).roots!.length > 0 && (
                  <Detail.Metadata.Label
                    title="Root Paths"
                    text={`${(config as VSCodeMCPServerConfig).roots!.length} path${(config as VSCodeMCPServerConfig).roots!.length !== 1 ? "s" : ""}`}
                  />
                )}
            </>
          )}

          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Last Test Result"
            text={{
              value: testResultDisplay.text,
              color: testResultDisplay.color,
            }}
            icon={testResultDisplay.icon}
          />

          {testResult && (
            <>
              <Detail.Metadata.Label
                title="Test Message"
                text={testResult.message}
              />
              <Detail.Metadata.Label
                title="Test Time"
                text={testResult.timestamp.toLocaleString()}
              />
              {testResult.error && (
                <Detail.Metadata.Label
                  title="Error Details"
                  text={testResult.error}
                />
              )}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Configuration Help"
              icon={Icon.QuestionMarkCircle}
              target={
                <RawConfigHelpScreen
                  editorType={server.editor}
                  configType={server.source as "global" | "workspace" | "user"}
                />
              }
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
            {isUnlocked && (
              <Action.Push
                title="Edit Server"
                icon={Icon.Pencil}
                target={
                  <EditServerForm
                    editorType={server.editor}
                    serverName={server.config.name}
                    configType={
                      server.source as "global" | "workspace" | "user"
                    }
                    onComplete={loadServerDetails}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            )}
            <Action.Push
              title="Edit Raw Config"
              icon={Icon.Code}
              target={
                <EditRawConfigWrapper
                  editorType={server.editor}
                  configType={server.source as "global" | "workspace" | "user"}
                  onSave={loadServerDetails}
                />
              }
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            />
            <Action
              title="Test Connection"
              icon={Icon.Network}
              onAction={testConnection}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
            <Action
              title="Refresh Details"
              icon={Icon.ArrowClockwise}
              onAction={loadServerDetails}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Server Name"
              content={config.name}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Configuration"
              content={JSON.stringify(config, null, 2)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Test Command"
              content={connectionTestService.getTestDescription(server.config)}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            {testResult && testResult.error && (
              <Action.CopyToClipboard
                title="Copy Error Details"
                content={testResult.error}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            {isUnlocked && (
              <Action
                title="Remove Server"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={removeServer}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function EditRawConfigWrapper({
  editorType,
  configType,
  onSave,
}: {
  editorType: EditorType;
  configType: "global" | "workspace" | "user";
  onSave?: () => void;
}) {
  const [configContent, setConfigContent] = useState<string>("");
  const [configPath, setConfigPath] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [editorManager] = useState(() => new EditorManager());

  useEffect(() => {
    loadConfigContent();
  }, []);

  async function loadConfigContent() {
    try {
      setIsLoading(true);
      const service = editorManager.getService(editorType);

      if (!service.isConfigTypeAvailable(configType)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Config type not available",
          message: `${getEditorConfig(editorType).displayName} ${configType} configuration is not available in this context`,
        });
        setConfigContent("{}");
        return;
      }

      const path = service.getConfigPath(configType);
      if (!path) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Config path not found",
          message: `Unable to determine config path for ${editorType} ${configType}`,
        });
        setConfigContent("{}");
        return;
      }

      setConfigPath(path);

      if (!existsSync(path)) {
        const emptyConfig = getEmptyConfigStructure(editorType, configType);
        setConfigContent(JSON.stringify(emptyConfig, null, 2));
        return;
      }

      const content = await readFile(path, "utf-8");

      if (editorType === "vscode" && configType === "user") {
        try {
          const settingsData = JSON.parse(content);
          const mcpSection = settingsData.mcp || {};
          setConfigContent(JSON.stringify(mcpSection, null, 2));
        } catch {
          setConfigContent(content);
        }
      } else {
        setConfigContent(content);
      }
    } catch (error) {
      console.error("Error loading config:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load config",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setConfigContent("{}");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveConfigContent(
    newContent: string,
  ): Promise<{ success: boolean; formattedContent: string }> {
    try {
      if (!configPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot save configuration",
          message: "No valid config path available",
        });
        return { success: false, formattedContent: newContent };
      }

      let formattedContent = newContent;
      try {
        const parsedJson = JSON.parse(newContent);
        formattedContent = JSON.stringify(parsedJson, null, 2);
      } catch {
        // Note: We'll catch any JSON syntax errors in validation below
      }

      let finalContent = formattedContent;
      if (editorType === "vscode" && configType === "user") {
        try {
          const existingContent = existsSync(configPath)
            ? await readFile(configPath, "utf-8")
            : "{}";
          const existingData = JSON.parse(existingContent);
          const newMcpData = JSON.parse(formattedContent);
          const fullSettings = { ...existingData, mcp: newMcpData };
          finalContent = JSON.stringify(fullSettings, null, 2);
        } catch (error) {
          showFailureToast(
            `Failed to save ${editorType === "vscode" ? "VS Code" : "Cursor"} config`,
            { message: error instanceof Error ? error.message : String(error) },
          );
          throw error;
        }
      }

      const { mkdir } = await import("fs/promises");
      const { dirname } = await import("path");
      await mkdir(dirname(configPath), { recursive: true });
      const { writeFile } = await import("fs/promises");
      await writeFile(configPath, finalContent, "utf-8");

      await showToast({
        style: Toast.Style.Success,
        title: "Configuration saved",
        message: `Saved to ${configPath.split("/").pop()}`,
      });

      if (onSave) {
        onSave();
      }

      return { success: true, formattedContent };
    } catch (error) {
      console.error("Error saving config:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save config",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return { success: false, formattedContent: newContent };
    }
  }

  function getEmptyConfigStructure(
    editorType: EditorType,
    configType: string,
  ): object {
    switch (editorType) {
      case "cursor":
        return { mcpServers: {} };
      case "windsurf":
        return {};
      case "vscode":
        if (configType === "user") {
          return { servers: {}, inputs: [] };
        }
        return { servers: {}, inputs: [] };
      default:
        return {};
    }
  }

  if (isLoading) {
    return <Detail isLoading={true} navigationTitle="Loading Config..." />;
  }

  return (
    <RawConfigEditForm
      editorType={editorType}
      configType={configType}
      initialContent={configContent}
      onSave={saveConfigContent}
    />
  );
}
