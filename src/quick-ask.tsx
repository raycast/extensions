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
import { useCallback, useState } from "react";
import { ApiError, getTierInfo, singleChat } from "./api/pollinations";
import type { Message } from "./api/pollinations";
import { useModels } from "./hooks/useModels";
import type { PollinationsModel } from "./hooks/useModels";

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

export default function QuickAskCommand() {
  const { models, selectedModel, activeModel, selectModel, isLoadingModels } =
    useModels();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const tier = getTierInfo();

  const openModelPicker = useCallback(() => {
    push(
      <ModelPicker
        models={models}
        currentModel={selectedModel}
        onSelect={selectModel}
      />,
    );
  }, [push, models, selectedModel, selectModel]);

  const handleSubmit = useCallback(
    async (values: { question: string }) => {
      const q = values.question.trim();
      if (!q) return;

      if (tier.modelNeedsKey && !tier.hasKey) {
        await showToast({
          title: "API Anahtarı Gerekli",
          message: `"${selectedModel}" modeli için API anahtarı gereklidir. ⌘ , ile ekleyin.`,
          style: Toast.Style.Failure,
        });
        return;
      }

      setIsLoading(true);
      setAnswer(null);
      try {
        const result = await singleChat(
          [SYSTEM_PROMPT, { role: "user", content: q }],
          selectedModel,
        );
        setAnswer(result);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        const { title, message } = friendlyError(e);
        await showToast({ title, message, style: Toast.Style.Failure });
      } finally {
        setIsLoading(false);
      }
    },
    [selectedModel, tier],
  );

  if (answer !== null) {
    const markdown = `## Soru\n\n${question}\n\n---\n\n## Cevap\n\n${answer}`;
    return (
      <Detail
        markdown={markdown}
        isLoading={isLoading}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Model"
              icon={
                tier.hasKey
                  ? { source: Icon.Key, tintColor: Color.Green }
                  : { source: Icon.LockUnlocked, tintColor: Color.Orange }
              }
              text={selectedModel}
            />
            {activeModel?.description ? (
              <Detail.Metadata.Label title="" text={activeModel.description} />
            ) : null}
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
              title="Model Değiştir"
              icon={Icon.Switch}
              onAction={openModelPicker}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
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

  const tierText = activeModel
    ? `${tier.hasKey ? "Premium" : "Ücretsiz"} · ${activeModel.description || selectedModel}`
    : selectedModel;

  return (
    <Form
      isLoading={isLoading || isLoadingModels}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Sor"
            icon={Icon.Message}
            onSubmit={handleSubmit}
          />
          <Action
            title="Model Değiştir"
            icon={Icon.Switch}
            onAction={openModelPicker}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
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
      <Form.Description title="Model" text={tierText} />
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
