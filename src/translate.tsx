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
import { useLocalStorage } from "@raycast/utils";
import { useCallback, useState } from "react";
import { ApiError, friendlyError, singleChat } from "./api/pollinations";
import type { Message } from "./api/pollinations";
import { useAuth } from "./hooks/useAuth";
import { getStoredModel, useModels } from "./hooks/useModels";
import { usePollenBalance } from "./hooks/usePollenBalance";

// ─── Language list ────────────────────────────────────────────────────────────

const LANGUAGES = [
  { value: "English", title: "English" },
  { value: "Turkish", title: "Turkish" },
  { value: "Spanish", title: "Spanish" },
  { value: "French", title: "French" },
  { value: "German", title: "German" },
  { value: "Italian", title: "Italian" },
  { value: "Portuguese", title: "Portuguese" },
  { value: "Dutch", title: "Dutch" },
  { value: "Russian", title: "Russian" },
  { value: "Arabic", title: "Arabic" },
  { value: "Chinese (Simplified)", title: "Chinese (Simplified)" },
  { value: "Chinese (Traditional)", title: "Chinese (Traditional)" },
  { value: "Japanese", title: "Japanese" },
  { value: "Korean", title: "Korean" },
  { value: "Hindi", title: "Hindi" },
  { value: "Polish", title: "Polish" },
  { value: "Swedish", title: "Swedish" },
  { value: "Norwegian", title: "Norwegian" },
  { value: "Danish", title: "Danish" },
  { value: "Finnish", title: "Finnish" },
  { value: "Greek", title: "Greek" },
  { value: "Czech", title: "Czech" },
  { value: "Romanian", title: "Romanian" },
  { value: "Hungarian", title: "Hungarian" },
  { value: "Ukrainian", title: "Ukrainian" },
  { value: "Hebrew", title: "Hebrew" },
  { value: "Thai", title: "Thai" },
  { value: "Vietnamese", title: "Vietnamese" },
  { value: "Indonesian", title: "Indonesian" },
];

const TARGET_LANG_KEY = "translate-target-language";
const DEFAULT_LANG = "English";

function buildSystemPrompt(targetLanguage: string): Message {
  return {
    role: "system",
    content: `You are a professional translator.
Translate the user's text into ${targetLanguage}.
Rules:
- Preserve the original meaning, tone, and formatting.
- Do NOT add explanations or comments — return ONLY the translated text.
- If the text is already in ${targetLanguage}, return it as-is.`,
  };
}

// ─── Command ──────────────────────────────────────────────────────────────────

export default function TranslateCommand() {
  const tier = useAuth();
  const { models, selectedModel, isLoadingModels, selectModel } = useModels(tier.hasKey);

  // useLocalStorage from @raycast/utils — persists across sessions automatically
  const { value: targetLang, setValue: setTargetLang } = useLocalStorage(
    TARGET_LANG_KEY,
    DEFAULT_LANG,
  );

  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [usedLang, setUsedLang] = useState<string>(DEFAULT_LANG);
  const [isLoading, setIsLoading] = useState(false);
  const pollenBalance = usePollenBalance();

  const handleSubmit = useCallback(
    async (values: { text: string; targetLang: string }) => {
      const text = values.text.trim();
      if (!text) return;

      // Persist the selected language for next time
      await setTargetLang(values.targetLang);
      setUsedLang(values.targetLang);

      setIsLoading(true);
      setResult(null);
      try {
        const model = await getStoredModel();
        const translated = await singleChat(
          [
            buildSystemPrompt(values.targetLang),
            { role: "user", content: text },
          ],
          model,
        );
        setResult(translated);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        if (e instanceof ApiError && e.isAuthError && !tier.hasKey) {
          await launchCommand({ name: "connect", type: LaunchType.UserInitiated });
          return;
        }
        const { title, message } = friendlyError(e);
        await showToast({ title, message, style: Toast.Style.Failure });
      } finally {
        setIsLoading(false);
      }
    },
    [setTargetLang],
  );

  if (result !== null) {
    const markdown = `## Original\n\n${input}\n\n---\n\n## Translation (${usedLang})\n\n${result}`;
    return (
      <Detail
        markdown={markdown}
        isLoading={isLoading}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Target Language"
              icon={{ source: Icon.Globe, tintColor: Color.Blue }}
              text={usedLang}
            />
            <Detail.Metadata.Label
              title="Model"
              icon={{ source: Icon.ComputerChip, tintColor: Color.Purple }}
              text={selectedModel}
            />
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
              title="Copy Translation"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(result);
                await showToast({
                  title: "Copied",
                  style: Toast.Style.Success,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Translate New Text"
              icon={Icon.RotateClockwise}
              onAction={() => {
                setResult(null);
                setInput("");
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
            title="Translate"
            icon={Icon.Globe}
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
        id="targetLang"
        title="Target Language"
        value={targetLang ?? DEFAULT_LANG}
        onChange={setTargetLang}
      >
        {LANGUAGES.map((lang) => (
          <Form.Dropdown.Item
            key={lang.value}
            value={lang.value}
            title={lang.title}
          />
        ))}
      </Form.Dropdown>
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
        id="text"
        title="Text"
        placeholder="Enter the text you want to translate…"
        value={input}
        onChange={setInput}
        autoFocus
      />
    </Form>
  );
}
