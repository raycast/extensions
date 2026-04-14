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
import { friendlyError, getTierInfo, singleChat } from "./api/pollinations";
import type { Message } from "./api/pollinations";
import { getStoredModel, useModels } from "./hooks/useModels";

const SYSTEM_PROMPT: Message = {
  role: "system",
  content:
    "You are a helpful AI assistant. Be concise and clear. Format responses in Markdown when appropriate.",
};

export default function QuickAskCommand() {
  const { models, selectedModel, activeModel, selectModel, isLoadingModels } =
    useModels();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const tier = getTierInfo();

  const handleSubmit = useCallback(
    async (values: { question: string }) => {
      const q = values.question.trim();
      if (!q) return;

      if (tier.modelNeedsKey && !tier.hasKey) {
        await showToast({
          title: "API Key Required",
          message: `"${selectedModel}" requires an API key. Add one with ⌘ ,.`,
          style: Toast.Style.Failure,
        });
        return;
      }

      setIsLoading(true);
      setAnswer(null);
      try {
        const model = await getStoredModel();
        const result = await singleChat(
          [SYSTEM_PROMPT, { role: "user", content: q }],
          model,
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
    const markdown = `## Question\n\n${question}\n\n---\n\n## Answer\n\n${answer}`;
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
              title="Copy Answer"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(answer);
                await showToast({
                  title: "Copied",
                  style: Toast.Style.Success,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Ask New Question"
              icon={Icon.RotateClockwise}
              onAction={() => {
                setAnswer(null);
                setQuestion("");
              }}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title={tier.hasKey ? "Change API Key" : "Add API Key"}
              icon={Icon.Key}
              onAction={openExtensionPreferences}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  const free = models.filter((m) => !m.isPaid);
  const paid = models.filter((m) => m.isPaid);

  return (
    <Form
      isLoading={isLoading || isLoadingModels}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            icon={Icon.Message}
            onSubmit={handleSubmit}
          />
          <Action
            title={tier.hasKey ? "Change API Key" : "Add API Key"}
            icon={Icon.Key}
            onAction={openExtensionPreferences}
            shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="model"
        title="Model"
        value={selectedModel}
        onChange={selectModel}
      >
        {free.length > 0 && (
          <Form.Dropdown.Section title="Free">
            {free.map((m) => (
              <Form.Dropdown.Item key={m.name} value={m.name} title={m.name} />
            ))}
          </Form.Dropdown.Section>
        )}
        {paid.length > 0 && (
          <Form.Dropdown.Section title="Paid (API key required)">
            {paid.map((m) => (
              <Form.Dropdown.Item key={m.name} value={m.name} title={m.name} />
            ))}
          </Form.Dropdown.Section>
        )}
        {models.length === 0 && (
          <Form.Dropdown.Item value={selectedModel} title={selectedModel} />
        )}
      </Form.Dropdown>
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="What do you want to know?"
        value={question}
        onChange={setQuestion}
        autoFocus
      />
    </Form>
  );
}
