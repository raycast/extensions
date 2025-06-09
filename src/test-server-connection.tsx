import { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  Icon,
  List,
  Color,
  showToast,
  Toast,
  Detail,
} from "@raycast/api";
import { EditorManager } from "./services/EditorManager";
import { ConnectionTestService } from "./services/ConnectionTestService";
import {
  MCPServerWithMetadata,
  EditorType,
  ConnectionTestResult,
} from "./types/mcpServer";
import { getEditorConfig } from "./utils/constants";

export default function Command() {
  const [servers, setServers] = useState<MCPServerWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editorFilter, setEditorFilter] = useState<"all" | EditorType>("all");
  const [editorManager] = useState(() => new EditorManager());
  const [connectionTestService] = useState(() => new ConnectionTestService());
  const [testResults, setTestResults] = useState<
    Map<string, ConnectionTestResult>
  >(new Map());

  useEffect(() => {
    loadServers();
  }, []);

  async function loadServers() {
    try {
      setIsLoading(true);
      const allServers = await editorManager.readAllServers();
      setServers(allServers);
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

  async function testSingleConnection(server: MCPServerWithMetadata) {
    const serverKey = `${server.editor}-${server.config.name}`;
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

      setTestResults((prev) => new Map(prev.set(serverKey, result)));

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

  async function testAllConnections() {
    await showToast({
      style: Toast.Style.Animated,
      title: "Testing all connections...",
      message: `Testing ${filteredServers.length} server(s)`,
    });

    let successCount = 0;
    let failureCount = 0;

    for (const server of filteredServers) {
      const serverKey = `${server.editor}-${server.config.name}`;

      try {
        const result = await connectionTestService.testConnection(
          server.config,
        );
        setTestResults((prev) => new Map(prev.set(serverKey, result)));

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`Failed to test ${server.config.name}:`, error);
        failureCount++;
      }
    }

    await showToast({
      style:
        successCount > 0 && failureCount === 0
          ? Toast.Style.Success
          : successCount === 0
            ? Toast.Style.Failure
            : Toast.Style.Animated,
      title: "Connection tests completed",
      message: `${successCount} successful, ${failureCount} failed`,
    });
  }

  function getResultStatus(server: MCPServerWithMetadata) {
    const serverKey = `${server.editor}-${server.config.name}`;
    const result = testResults.get(serverKey);

    if (!result) {
      return {
        icon: Icon.Minus,
        color: Color.SecondaryText,
        text: "Not tested",
      };
    }

    if (result.success) {
      return {
        icon: Icon.CheckCircle,
        color: Color.Green,
        text: `Success (${result.responseTime}ms)`,
      };
    } else {
      return {
        icon: Icon.XMarkCircle,
        color: Color.Red,
        text: "Failed",
      };
    }
  }

  function getTransportIcon(transport: string | undefined) {
    switch (transport) {
      case "stdio":
        return Icon.Terminal;
      case "sse":
      case "/sse":
        return Icon.Globe;
      case "http":
        return Icon.Network;
      default:
        return Icon.QuestionMark;
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Test Server Connections"
      searchBarPlaceholder="Search servers to test..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Editor"
          value={editorFilter}
          onChange={(newValue) =>
            setEditorFilter(newValue as "all" | EditorType)
          }
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
          <Action
            title="Test All Connections"
            icon={Icon.Network}
            onAction={testAllConnections}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          />
          <Action
            title="Refresh Servers"
            icon={Icon.ArrowClockwise}
            onAction={loadServers}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Clear Results"
            icon={Icon.Trash}
            onAction={() => setTestResults(new Map())}
            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          />
        </ActionPanel>
      }
    >
      {filteredServers.map((server) => {
        const editorConfig = getEditorConfig(server.editor);
        const transportIcon = getTransportIcon(server.config.transport);
        const status = getResultStatus(server);
        const serverKey = `${server.editor}-${server.config.name}`;
        const result = testResults.get(serverKey);

        return (
          <List.Item
            key={serverKey}
            icon={{
              source: transportIcon,
              tintColor: server.config.disabled
                ? Color.SecondaryText
                : Color.PrimaryText,
            }}
            title={server.config.name}
            subtitle={`${editorConfig.displayName} • ${server.config.transport?.toUpperCase() || "Unknown"}`}
            accessories={[
              {
                icon: {
                  source: status.icon,
                  tintColor: status.color,
                },
                text: status.text,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Test Connection"
                    icon={Icon.Network}
                    onAction={() => testSingleConnection(server)}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                  {result && (
                    <Action.Push
                      title="View Test Details"
                      icon={Icon.Eye}
                      target={
                        <TestResultDetail server={server} result={result} />
                      }
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                  )}
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title="Test All Connections"
                    icon={Icon.Network}
                    onAction={testAllConnections}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  />
                  <Action
                    title="Clear Results"
                    icon={Icon.Trash}
                    onAction={() => setTestResults(new Map())}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Server Name"
                    content={server.config.name}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Test Command"
                    content={connectionTestService.getTestDescription(
                      server.config,
                    )}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}

      {filteredServers.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Network}
          title="No Servers Found"
          description="No MCP servers available for connection testing"
        />
      )}
    </List>
  );
}

function TestResultDetail({
  server,
  result,
}: {
  server: MCPServerWithMetadata;
  result: ConnectionTestResult;
}) {
  const editorConfig = getEditorConfig(server.editor);

  const markdown = `
# Connection Test Results

## Server Information
- **Name:** ${server.config.name}
- **Editor:** ${editorConfig.displayName}
- **Transport:** ${server.config.transport?.toUpperCase() || "Unknown"}
- **Status:** ${server.config.disabled ? "Disabled" : "Enabled"}

## Test Results
- **Success:** ${result.success ? "Yes" : "No"}
- **Message:** ${result.message}
- **Response Time:** ${result.responseTime}ms
- **Timestamp:** ${result.timestamp.toLocaleString()}

${result.error ? `## Error Details\n\`\`\`\n${result.error}\n\`\`\`` : ""}

## Configuration Details
\`\`\`json
${JSON.stringify(server.config, null, 2)}
\`\`\`
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Test Results: ${server.config.name}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Results"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Error"
            content={result.error || "No error"}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
