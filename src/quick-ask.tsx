import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useState } from "react";
import { ApiError, friendlyError, getTierInfo, singleChat } from "./api/pollinations";
import type { Message } from "./api/pollinations";
import { getStoredModel, useModels } from "./hooks/useModels";
import { usePollenBalance } from "./hooks/usePollenBalance";
import { useAuth } from "./hooks/useAuth";

const SYSTEM_PROMPT: Message = {
  role: "system",
  content:
    "You are a helpful AI assistant. Be concise and clear. Format responses in Markdown when appropriate.",
};

export default function QuickAskCommand() {
  const tier = useAuth();
  const pollenBalance = usePollenBalance();
  const { models, selectedModel, activeModel, selectModel, isLoadingModels } =
    useModels(tier.hasKey);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (values: { question: string }) => {
      const q = values.question.trim();
      if (!q) return;

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
        if (e instanceof ApiError && e.isAuthError && !tier.isLoading && !tier.hasKey) {
          await launchCommand({ name: "connect", type: LaunchType.UserInitiated });
          return;
        }
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
              title="Tier"
              icon={
                tier.keyTier === "premium"
                  ? { source: Icon.Key, tintColor: Color.Green }
                  : tier.keyTier === "free"
                    ? { source: Icon.LockUnlocked, tintColor: Color.Blue }
                    : { source: Icon.LockUnlocked, tintColor: Color.Orange }
              }
              text={tier.keyTier === "premium" ? "Premium" : tier.keyTier === "free" ? "Free" : "No Key"}
            />
            <Detail.Metadata.Label title="Model" text={selectedModel} />
            {activeModel?.description ? (
              <Detail.Metadata.Label title="" text={activeModel.description} />
            ) : null}
            {pollenBalance !== null ? (
              <Detail.Metadata.Label
                title="Pollen"
                icon={{ source: Icon.Bolt, tintColor: Color.Yellow }}
                text={`${pollenBalance}`}
              />
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
            {!tier.hasKey && (
              <Action
                title="Connect Account"
                icon={Icon.Person}
                onAction={() => launchCommand({ name: "connect", type: LaunchType.UserInitiated })}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  const free = models.filter((m) => !m.isPaid);
  const paid = tier.hasKey ? models.filter((m) => m.isPaid) : [];

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
          {!tier.hasKey && (
            <Action
              title="Connect Account"
              icon={Icon.Person}
              onAction={() => launchCommand({ name: "connect", type: LaunchType.UserInitiated })}
            />
          )}
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
          <Form.Dropdown.Section>
            {free.map((m) => (
              <Form.Dropdown.Item key={m.name} value={m.name} title={m.name} />
            ))}
          </Form.Dropdown.Section>
        )}
        {paid.length > 0 && (
          <Form.Dropdown.Section title="Paid">
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
