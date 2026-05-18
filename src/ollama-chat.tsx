import {
  ActionPanel,
  Action,
  List,
  Detail,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { Message, OllamaToolCall, OllamaModel, MCPServer } from "./types";
import {
  getBridgeStatus,
  getBridgeTools,
  executeToolViaBridge,
} from "./mcp-bridge-client";
import { fetchModels, streamChat } from "./ollama";

interface Preferences {
  ollamaUrl: string;
  defaultModel: string;
}

function formatMarkdown(
  messages: Message[],
  streamingText: string,
  model: string,
  servers: MCPServer[],
): string {
  const connected = servers.filter((s) => s.connected);
  const toolSummary =
    connected.length > 0
      ? `\n\n> **MCP Tools:** ${connected
          .map((s) => `${s.name} (${s.tools.length})`)
          .join(", ")}`
      : "\n\n> ⚠️ MCP Bridge not running. Start with: `node mcp-bridge.js`";

  if (messages.length === 0 && !streamingText) {
    return `# 🦙 Ollama + MCP Chat\n\n**Model:** \`${model}\`${toolSummary}\n\nPress **⌘+N** to start chatting. **⌘+T** to see tools.`;
  }

  const display = streamingText
    ? [...messages, { role: "assistant" as const, content: streamingText }]
    : messages;

  return display
    .map((m) => {
      if (m.role === "user") return `### 🧑 You\n\n${m.content}`;
      if (m.role === "tool") {
        let content = m.content;
        try {
          const parsed = JSON.parse(m.content);
          if (parsed.content) {
            content = parsed.content
              .map((c: { text?: string }) => c.text || JSON.stringify(c))
              .join("\n");
          }
        } catch {
          // ignore parse errors
        }
        return `> 🔧 **${m.name || "Tool"}**\n>\n> ${content.split("\n").join("\n> ")}`;
      }
      if (m.role === "assistant") {
        let text = `### 🤖 ${model}\n\n${m.content || "*(thinking...)*"}`;
        if (m.tool_calls?.length) {
          text +=
            "\n\n" +
            m.tool_calls
              .map((tc) => `🔧 Calling \`${tc.function.name}\`...`)
              .join("\n");
        }
        return text;
      }
      return "";
    })
    .join("\n\n---\n\n");
}

function MessageForm({ onSend }: { onSend: (msg: string) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send"
            icon={Icon.Message}
            onSubmit={(values: { message: string }) => {
              if (values.message.trim()) {
                onSend(values.message.trim());
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="message"
        title="Message"
        placeholder="Ask anything..."
        autoFocus
      />
    </Form>
  );
}

function ToolsView({ servers }: { servers: MCPServer[] }) {
  const connected = servers.filter((s) => s.connected);
  const markdown =
    connected.length === 0
      ? "# 🔧 No MCP Tools\n\nMCP Bridge server is not running.\n\nStart it:\n```\ncd /Users/scotgardner/.cola/outputs/raycast-ollama\nnode mcp-bridge.js\n```"
      : connected
          .map(
            (s) =>
              `### ${s.name}\n\n${s.tools.map((t) => `- **${t.name}**`).join("\n")}`,
          )
          .join("\n\n---\n\n");
  return <Detail markdown={markdown} />;
}

function ChatView({
  model,
  servers,
  tools,
}: {
  model: string;
  servers: MCPServer[];
  tools: import("./types").OllamaTool[];
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const ollamaUrl =
    getPreferenceValues<Preferences>().ollamaUrl || "http://localhost:11434";
  const { push } = useNavigation();

  const processTurn = useCallback(
    async (msgs: Message[]) => {
      setIsLoading(true);
      setStreamingText("");

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      let fullResponse = "";
      let toolCallsReceived: OllamaToolCall[] = [];

      try {
        await new Promise<void>((resolve, reject) => {
          streamChat(
            ollamaUrl,
            model,
            msgs,
            tools,
            {
              onToken: (token) => {
                fullResponse += token;
                setStreamingText(fullResponse);
              },
              onToolCalls: (calls) => {
                toolCallsReceived = calls;
              },
              onDone: () => resolve(),
              onError: (err) => reject(err),
            },
            ctrl.signal,
          );
        });
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          showToast(Toast.Style.Failure, "Error", (err as Error).message);
        }
        setIsLoading(false);
        return;
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: fullResponse,
        ...(toolCallsReceived.length > 0 && { tool_calls: toolCallsReceived }),
      };
      const updatedMsgs = [...msgs, assistantMsg];
      setMessages(updatedMsgs);
      setStreamingText("");

      if (toolCallsReceived.length > 0) {
        showToast(
          Toast.Style.Animated,
          "Executing tools...",
          `${toolCallsReceived.length} tool(s)`,
        );

        const toolResults: Message[] = [];
        for (const tc of toolCallsReceived) {
          showToast(
            Toast.Style.Animated,
            `🔧 ${tc.function.name}`,
            "Running...",
          );
          const result = await executeToolViaBridge(
            tc.function.name,
            tc.function.arguments || {},
          );
          toolResults.push({
            role: "tool",
            content: result,
            name: tc.function.name,
          });
        }

        showToast(
          Toast.Style.Success,
          "Tools done",
          `${toolResults.length} result(s)`,
        );
        const nextMsgs = [...updatedMsgs, ...toolResults];
        setMessages(nextMsgs);
        await processTurn(nextMsgs);
      }

      setIsLoading(false);
    },
    [model, ollamaUrl, tools],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: Message = { role: "user", content };
      const newMsgs = [...messages, userMsg];
      setMessages(newMsgs);
      await processTurn(newMsgs);
    },
    [messages, processTurn],
  );

  const lastResponse =
    streamingText ||
    messages.filter((m) => m.role === "assistant").pop()?.content ||
    "";

  return (
    <Detail
      isLoading={isLoading && !streamingText}
      markdown={formatMarkdown(messages, streamingText, model, servers)}
      actions={
        <ActionPanel>
          {!isLoading && (
            <Action
              title="New Message"
              icon={Icon.Message}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => push(<MessageForm onSend={sendMessage} />)}
            />
          )}
          {isLoading && (
            <Action
              title="Stop"
              icon={Icon.Stop}
              onAction={() => abortRef.current?.abort()}
            />
          )}
          <Action
            title="View Tools"
            icon={Icon.WrenchScrewdriver}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={() => push(<ToolsView servers={servers} />)}
          />
          {lastResponse && (
            <Action.CopyToClipboard
              title="Copy Response"
              content={lastResponse}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          <Action
            title="Clear Chat"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd"], key: "k" }}
            onAction={() => {
              setMessages([]);
              setStreamingText("");
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [tools, setTools] = useState<import("./types").OllamaTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prefs = getPreferenceValues<Preferences>();
  const ollamaUrl = prefs.ollamaUrl || "http://localhost:11434";
  const defaultModel = prefs.defaultModel || "";
  const { push } = useNavigation();

  useEffect(() => {
    let mounted = true;

    async function init() {
      // Fetch Ollama models
      try {
        const m = await fetchModels(ollamaUrl);
        if (mounted) setModels(m);
      } catch (err: unknown) {
        if (mounted) setError((err as Error).message);
        setIsLoading(false);
        return;
      }

      // Check MCP bridge
      const bridgeStatus = await getBridgeStatus();
      if (mounted) {
        setServers(bridgeStatus.servers);
        if (bridgeStatus.running) {
          const t = await getBridgeTools();
          if (mounted) setTools(t);
        }
      }

      if (mounted) setIsLoading(false);
    }

    init();
    return () => {
      mounted = false;
    };
  }, [ollamaUrl]);

  useEffect(() => {
    if (
      defaultModel &&
      models.length > 0 &&
      !isLoading &&
      models.some((m) => m.name === defaultModel)
    ) {
      push(<ChatView model={defaultModel} servers={servers} tools={tools} />);
    }
  }, [defaultModel, models, isLoading, servers, tools, push]);

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Connection Error\n\nCould not connect to Ollama at \`${ollamaUrl}\`\n\n**Error:** ${error}\n\nMake sure Ollama is running:\n\`\`\`\nollama serve\n\`\`\``}
      />
    );
  }

  const formatSize = (bytes: number) =>
    bytes > 1e9
      ? `${(bytes / 1e9).toFixed(1)} GB`
      : `${(bytes / 1e6).toFixed(0)} MB`;

  const connectedCount = servers.filter((s) => s.connected).length;
  const toolCount = tools.length;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search models...">
      {servers.length > 0 && (
        <List.Section
          title="MCP Servers"
          subtitle={`${connectedCount} connected, ${toolCount} tools`}
        >
          {servers.map((s) => (
            <List.Item
              key={s.name}
              title={s.name}
              subtitle={
                s.connected
                  ? `${s.tools.length} tool${s.tools.length !== 1 ? "s" : ""}: ${s.tools
                      .map((t) => t.name)
                      .slice(0, 3)
                      .join(", ")}${s.tools.length > 3 ? "..." : ""}`
                  : "Disconnected"
              }
              icon={s.connected ? "✅" : "❌"}
            />
          ))}
        </List.Section>
      )}
      {!isLoading && servers.length === 0 && (
        <List.Section title="MCP Servers">
          <List.Item
            title="Bridge not running"
            subtitle="Start: node mcp-bridge.js"
            icon="⚠️"
          />
        </List.Section>
      )}
      <List.Section
        title="Local Models"
        subtitle={`${models.length} available`}
      >
        {models.map((model) => (
          <List.Item
            key={model.name}
            title={model.name}
            subtitle={`${formatSize(model.size)}${model.details?.parameter_size ? ` · ${model.details.parameter_size}` : ""}`}
            icon="🦙"
            actions={
              <ActionPanel>
                <Action
                  title={`Chat with ${model.name}`}
                  onAction={() =>
                    push(
                      <ChatView
                        model={model.name}
                        servers={servers}
                        tools={tools}
                      />,
                    )
                  }
                  icon={Icon.Message}
                />
                <Action
                  title="View Tools"
                  icon={Icon.WrenchScrewdriver}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  onAction={() => push(<ToolsView servers={servers} />)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
