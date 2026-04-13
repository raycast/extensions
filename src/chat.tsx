import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useState } from "react";
import { useChat } from "./hooks/useChat";
import type { ChatMessage } from "./hooks/useChat";

// ─── Markdown conversation renderer ───────────────────────────────────────────

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
      "> **⌘ ↵** ile mesaj gönderin &nbsp;·&nbsp; **⌘ ⇧ ⌫** geçmişi temizler",
    ].join("\n");
  }

  const lines: string[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      lines.push("---", "", `**Siz**`, "", msg.content, "");
    } else {
      lines.push("---", "", `**Asistan**`, "", msg.content, "");
    }
  }

  if (streamingContent) {
    lines.push("---", "", `**Asistan** *(yazıyor…)*`, "", streamingContent, "");
  }

  return lines.join("\n");
}

// ─── Send message form (pushed view) ─────────────────────────────────────────

interface SendFormProps {
  onSend: (text: string) => void;
}

function SendMessageForm({ onSend }: SendFormProps) {
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
  const {
    messages,
    isLoading,
    streamingContent,
    sendMessage,
    stopStreaming,
    clearHistory,
  } = useChat();
  const { push } = useNavigation();

  const openInput = useCallback(() => {
    push(<SendMessageForm onSend={sendMessage} />);
  }, [push, sendMessage]);

  const copyLast = useCallback(async () => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (last) {
      await Clipboard.copy(last.content);
      await showToast({ title: "Kopyalandı", style: Toast.Style.Success });
    }
  }, [messages]);

  const markdown = buildMarkdown(messages, streamingContent);

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
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
        </ActionPanel>
      }
    />
  );
}
