import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback } from "react";
import { friendlyError, getTierInfo } from "./api/pollinations";
import { useChat } from "./hooks/useChat";
import type { ChatMessage } from "./hooks/useChat";
import { useModels } from "./hooks/useModels";
import type { PollinationsModel } from "./hooks/useModels";

// ─── Markdown renderer ────────────────────────────────────────────────────────

function buildMarkdown(
  messages: ChatMessage[],
  streamingContent: string,
): string {
  if (messages.length === 0 && !streamingContent) {
    return [
      "# 🌸 Pollinations AI",
      "",
      "Hello! How can I help you today?",
      "",
      "> **⌘ ↵** send message &nbsp;·&nbsp; **⌘ M** change model &nbsp;·&nbsp; **⌘ ⇧ ⌫** clear history",
    ].join("\n");
  }

  const lines: string[] = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      lines.push("---", "", "**You**", "", msg.content, "");
    } else {
      lines.push("---", "", "**Assistant**", "", msg.content, "");
    }
  }
  if (streamingContent) {
    lines.push(
      "---",
      "",
      "**Assistant** *(typing…)*",
      "",
      streamingContent,
      "",
    );
  }
  return lines.join("\n");
}

// ─── Model picker ─────────────────────────────────────────────────────────────

function ModelPicker({
  models,
  currentModel,
  onSelect,
}: {
  models: PollinationsModel[];
  currentModel: string;
  onSelect: (model: string) => void;
}) {
  const { pop } = useNavigation();

  const free = models.filter((m) => !m.isPaid);
  const paid = models.filter((m) => m.isPaid);
  const grouped = [
    { label: "Free", items: free },
    { label: "🔑 Paid (API key required)", items: paid },
  ].filter((g) => g.items.length > 0);

  return (
    <List navigationTitle="Select Model" searchBarPlaceholder="Search models…">
      {grouped.map(({ label, items }) => (
        <List.Section key={label} title={label}>
          {items.map((m) => {
            const isCurrent = m.name === currentModel;
            const badges: List.Item.Accessory[] = [];
            if (isCurrent)
              badges.push({
                icon: { source: Icon.Checkmark, tintColor: Color.Green },
              });
            if (m.reasoning)
              badges.push({ tag: { value: "reasoning", color: Color.Purple } });
            if (m.vision)
              badges.push({ tag: { value: "vision", color: Color.Blue } });
            if (m.search)
              badges.push({ tag: { value: "search", color: Color.Green } });

            return (
              <List.Item
                key={m.name}
                title={m.name}
                subtitle={m.description}
                accessories={badges}
                actions={
                  <ActionPanel>
                    <Action
                      title="Select Model"
                      icon={Icon.CheckCircle}
                      onAction={() => {
                        onSelect(m.name);
                        pop();
                      }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

// ─── Send message form ────────────────────────────────────────────────────────

function SendMessageForm({ onSend }: { onSend: (text: string) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Send Message"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send"
            icon={Icon.Message}
            onSubmit={(values: { message: string }) => {
              const text = values.message.trim();
              if (!text) return;
              onSend(text);
              pop();
            }}
          />
          <Action
            title="Cancel"
            icon={Icon.Xmark}
            onAction={pop}
            shortcut={{ modifiers: ["cmd"], key: "escape" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title=""
        placeholder="Type your message…"
        autoFocus
      />
    </Form>
  );
}

// ─── Main chat view ───────────────────────────────────────────────────────────

export default function ChatCommand() {
  const { models, selectedModel, activeModel, selectModel, isLoadingModels } =
    useModels();
  const {
    messages,
    isLoading,
    streamingContent,
    sendMessage,
    stopStreaming,
    clearHistory,
  } = useChat();
  const { push } = useNavigation();

  const tier = getTierInfo();

  const handleSend = useCallback(
    async (text: string) => {
      try {
        await sendMessage(text);
      } catch (err) {
        const { title, message } = friendlyError(
          err instanceof Error ? err : new Error(String(err)),
        );
        await showToast({ title, message, style: Toast.Style.Failure });
      }
    },
    [sendMessage],
  );

  const openInput = useCallback(() => {
    push(<SendMessageForm onSend={handleSend} />);
  }, [push, handleSend]);

  const openModelPicker = useCallback(() => {
    push(
      <ModelPicker
        models={models}
        currentModel={selectedModel}
        onSelect={selectModel}
      />,
    );
  }, [push, models, selectedModel, selectModel]);

  const copyLast = useCallback(async () => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (last) {
      await Clipboard.copy(last.content);
      await showToast({ title: "Copied", style: Toast.Style.Success });
    }
  }, [messages]);

  const markdown = buildMarkdown(messages, streamingContent);

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading || isLoadingModels}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Tier"
            icon={
              tier.hasKey
                ? { source: Icon.Key, tintColor: Color.Green }
                : { source: Icon.LockUnlocked, tintColor: Color.Orange }
            }
            text={tier.hasKey ? "Premium" : "Free"}
          />
          <Detail.Metadata.Label title="Model" text={selectedModel} />
          {activeModel?.description ? (
            <Detail.Metadata.Label title="" text={activeModel.description} />
          ) : null}
          <Detail.Metadata.Separator />
          {!tier.hasKey && tier.modelNeedsKey ? (
            <Detail.Metadata.Label
              title="Warning"
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              text="This model requires an API key"
            />
          ) : !tier.hasKey ? (
            <Detail.Metadata.Label
              title="Tip"
              icon={{ source: Icon.Info, tintColor: Color.Blue }}
              text="Add an API key to unlock more models"
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Send Message"
              icon={Icon.Message}
              onAction={openInput}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
            {isLoading && (
              <Action
                title="Stop"
                icon={Icon.Stop}
                onAction={stopStreaming}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Change Model"
              icon={Icon.Switch}
              onAction={openModelPicker}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
            {messages.length > 0 && (
              <Action
                title="Copy Last Response"
                icon={Icon.Clipboard}
                onAction={copyLast}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
            {messages.length > 0 && (
              <Action
                title="Clear History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={clearHistory}
                shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Settings">
            <Action
              title={tier.hasKey ? "Change API Key" : "Add API Key"}
              icon={Icon.Key}
              onAction={openExtensionPreferences}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
