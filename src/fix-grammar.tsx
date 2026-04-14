import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useState } from "react";
import { friendlyError, singleChat } from "./api/pollinations";
import type { Message } from "./api/pollinations";
import { getStoredModel, useModels } from "./hooks/useModels";

const GRAMMAR_SYSTEM_PROMPT: Message = {
  role: "system",
  content: `You are a grammar and spelling correction assistant.
Your job is to fix grammar, spelling, punctuation, and phrasing errors in the user's text.
Rules:
- Detect the language automatically and correct in that same language.
- Do NOT translate the text.
- Do NOT change the meaning, tone, or style.
- Do NOT add explanations or comments — return ONLY the corrected text.
- If the text is already correct, return it as-is.`,
};

export default function FixGrammarCommand() {
  const { models, selectedModel, isLoadingModels, selectModel } = useModels();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (values: { text: string }) => {
    const text = values.text.trim();
    if (!text) return;

    setIsLoading(true);
    setResult(null);
    try {
      const model = await getStoredModel();
      const corrected = await singleChat(
        [GRAMMAR_SYSTEM_PROMPT, { role: "user", content: text }],
        model,
      );
      setResult(corrected);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      const { title, message } = friendlyError(e);
      await showToast({ title, message, style: Toast.Style.Failure });
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (result !== null) {
    const markdown = `## Original\n\n${input}\n\n---\n\n## Corrected\n\n${result}`;
    return (
      <Detail
        markdown={markdown}
        isLoading={isLoading}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Model"
              icon={{ source: Icon.Wand, tintColor: Color.Purple }}
              text={selectedModel}
            />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Copy & Close"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(result);
                await showHUD("✓ Copied — ready to paste");
              }}
            />
            <Action
              title="Copy Corrected Text"
              icon={Icon.CopyClipboard}
              onAction={async () => {
                await Clipboard.copy(result);
                await showToast({ title: "Copied", style: Toast.Style.Success });
              }}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Fix New Text"
              icon={Icon.RotateClockwise}
              onAction={() => {
                setResult(null);
                setInput("");
              }}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title="API Key Settings"
              icon={Icon.Key}
              onAction={openExtensionPreferences}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading || isLoadingModels}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Fix"
            icon={Icon.Wand}
            onSubmit={handleSubmit}
          />
          <Action
            title="API Key Settings"
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
        {models.filter((m) => !m.isPaid).length > 0 && (
          <Form.Dropdown.Section title="Free">
            {models
              .filter((m) => !m.isPaid)
              .map((m) => (
                <Form.Dropdown.Item
                  key={m.name}
                  value={m.name}
                  title={m.name}
                />
              ))}
          </Form.Dropdown.Section>
        )}
        {models.filter((m) => m.isPaid).length > 0 && (
          <Form.Dropdown.Section title="Paid (API key required)">
            {models
              .filter((m) => m.isPaid)
              .map((m) => (
                <Form.Dropdown.Item
                  key={m.name}
                  value={m.name}
                  title={m.name}
                />
              ))}
          </Form.Dropdown.Section>
        )}
        {models.length === 0 && (
          <Form.Dropdown.Item value={selectedModel} title={selectedModel} />
        )}
      </Form.Dropdown>
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Enter the text you want to fix…"
        value={input}
        onChange={setInput}
        autoFocus
      />
    </Form>
  );
}
