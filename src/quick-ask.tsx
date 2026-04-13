import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useState } from "react";
import { ApiError, getTierInfo, singleChat } from "./api/pollinations";
import type { Message } from "./api/pollinations";

const SYSTEM_PROMPT: Message = {
  role: "system",
  content:
    "You are a helpful AI assistant. Be concise and clear. Format responses in Markdown when appropriate.",
};

function friendlyError(err: Error): { title: string; message: string } {
  if (err instanceof ApiError) {
    if (err.isAuthError)
      return {
        title: "Geçersiz API Anahtarı",
        message: "Anahtarı kontrol edin veya ücretsiz katman için kaldırın.",
      };
    if (err.isRateLimited)
      return {
        title: "Hız Limiti Aşıldı",
        message: "API anahtarı ekleyerek limiti kaldırabilirsiniz. (⌘ ,)",
      };
  }
  return { title: "Hata", message: err.message };
}

export default function QuickAskCommand() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const tier = getTierInfo();

  const handleSubmit = useCallback(async (values: { question: string }) => {
    const q = values.question.trim();
    if (!q) return;
    setIsLoading(true);
    setAnswer(null);
    try {
      const result = await singleChat([
        SYSTEM_PROMPT,
        { role: "user", content: q },
      ]);
      setAnswer(result);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      const { title, message } = friendlyError(e);
      await showToast({ title, message, style: Toast.Style.Failure });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const tierLabel = tier.hasKey
    ? `Premium — ${tier.model}`
    : `Ücretsiz — ${tier.model} (⌘ , ile API anahtarı ekle)`;

  if (answer !== null) {
    const markdown = `## Soru\n\n${question}\n\n---\n\n## Cevap\n\n${answer}`;
    return (
      <Detail
        markdown={markdown}
        isLoading={isLoading}
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
            <Detail.Metadata.Label title="Model" text={tier.model} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Cevabı Kopyala"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(answer);
                await showToast({
                  title: "Kopyalandı",
                  style: Toast.Style.Success,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Yeni Soru Sor"
              icon={Icon.RotateClockwise}
              onAction={() => {
                setAnswer(null);
                setQuestion("");
              }}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title={
                tier.hasKey ? "API Anahtarını Değiştir" : "API Anahtarı Ekle"
              }
              icon={Icon.Key}
              onAction={openExtensionPreferences}
              shortcut={{ modifiers: ["cmd"], key: "," }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Sor"
            icon={Icon.Message}
            onSubmit={handleSubmit}
          />
          <Action
            title={
              tier.hasKey ? "API Anahtarını Değiştir" : "API Anahtarı Ekle"
            }
            icon={Icon.Key}
            onAction={openExtensionPreferences}
            shortcut={{ modifiers: ["cmd"], key: "," }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Katman" text={tierLabel} />
      <Form.TextArea
        id="question"
        title="Soru"
        placeholder="Ne öğrenmek istersiniz?"
        value={question}
        onChange={setQuestion}
        autoFocus
      />
    </Form>
  );
}
