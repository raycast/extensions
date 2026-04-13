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
import { ApiError, getTierInfo } from "./api/pollinations";
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
      "Merhaba! Size nasıl yardımcı olabilirim?",
      "",
      "> **⌘ ↵** mesaj gönder &nbsp;·&nbsp; **⌘ M** model değiştir &nbsp;·&nbsp; **⌘ ⇧ ⌫** geçmişi temizle",
    ].join("\n");
  }

  const lines: string[] = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      lines.push("---", "", "**Siz**", "", msg.content, "");
    } else {
      lines.push("---", "", "**Asistan**", "", msg.content, "");
    }
  }
  if (streamingContent) {
    lines.push("---", "", "**Asistan** *(yazıyor…)*", "", streamingContent, "");
  }
  return lines.join("\n");
}

// ─── Error messages ───────────────────────────────────────────────────────────

function friendlyError(err: Error): { title: string; message: string } {
  if (err instanceof ApiError) {
    if (err.isAuthError)
      return {
        title: "Geçersiz API Anahtarı",
        message:
          "Anahtarı kontrol edin veya ücretsiz katman için kaldırın. (⌘ ,)",
      };
    if (err.isRateLimited)
      return {
        title: "Hız Limiti Aşıldı",
        message: "API anahtarı ekleyerek limiti kaldırabilirsiniz. (⌘ ,)",
      };
  }
  return { title: "Hata", message: err.message };
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
    { label: "Ücretsiz", items: free },
    { label: "🔑 Ücretli (API anahtarı gerekli)", items: paid },
  ].filter((g) => g.items.length > 0);

  return (
    <List navigationTitle="Model Seç" searchBarPlaceholder="Model ara…">
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
                      title="Bu Modeli Seç"
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
      navigationTitle="Mesaj Gönder"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Gönder"
            icon={Icon.Message}
            onSubmit={(values: { message: string }) => {
              const text = values.message.trim();
              if (!text) return;
              onSend(text);
              pop();
            }}
          />
          <Action
            title="İptal"
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
        placeholder="Mesajınızı yazın…"
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

  const openInput = useCallback(() => {
    push(<SendMessageForm onSend={sendMessage} />);
  }, [push, sendMessage]);

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
      await showToast({ title: "Kopyalandı", style: Toast.Style.Success });
    }
  }, [messages]);

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

  const markdown = buildMarkdown(messages, streamingContent);

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading || isLoadingModels}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Katman"
            icon={
              tier.hasKey
                ? { source: Icon.Key, tintColor: Color.Green }
                : { source: Icon.LockUnlocked, tintColor: Color.Orange }
            }
            text={tier.hasKey ? "Premium" : "Ücretsiz"}
          />
          <Detail.Metadata.Label title="Model" text={selectedModel} />
          {activeModel?.description ? (
            <Detail.Metadata.Label title="" text={activeModel.description} />
          ) : null}
          <Detail.Metadata.Separator />
          {!tier.hasKey && tier.modelNeedsKey ? (
            <Detail.Metadata.Label
              title="Uyarı"
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              text="Bu model API anahtarı gerektirir"
            />
          ) : !tier.hasKey ? (
            <Detail.Metadata.Label
              title="İpucu"
              icon={{ source: Icon.Info, tintColor: Color.Blue }}
              text="API anahtarı ile daha fazla model açılır"
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Mesaj Gönder"
              icon={Icon.Message}
              onAction={openInput}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
            {isLoading && (
              <Action
                title="Durdur"
                icon={Icon.Stop}
                onAction={stopStreaming}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Model Değiştir"
              icon={Icon.Switch}
              onAction={openModelPicker}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
            {messages.length > 0 && (
              <Action
                title="Son Cevabı Kopyala"
                icon={Icon.Clipboard}
                onAction={copyLast}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
            {messages.length > 0 && (
              <Action
                title="Geçmişi Temizle"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={clearHistory}
                shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Ayarlar">
            <Action
              title={
                tier.hasKey ? "API Anahtarını Değiştir" : "API Anahtarı Ekle"
              }
              icon={Icon.Key}
              onAction={openExtensionPreferences}
              shortcut={{ modifiers: ["cmd"], key: "," }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
