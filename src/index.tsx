import { useState, useEffect, useMemo, useRef } from "react";
import {
  Action,
  ActionPanel,
  closeMainWindow,
  showToast,
  Toast,
  List,
  Icon,
  openCommandPreferences,
  getPreferenceValues,
  Clipboard,
} from "@raycast/api";
import { usePersistentState } from "raycast-toolkit";
import {
  getKnownPrompts,
  addKnownPrompt,
  runCommandInDefaultTerminal,
  executeAndCaptureOutput,
} from "./utils";
import { convertPrompt } from "./engine";
import {
  MODELS_BY_PROVIDER,
  OPENAI_MODELS,
  type Provider,
  type ModelOption,
} from "./config";
import { globalCache } from "./cache";
import type { ShellBuddyArguments, CommandHistoryItem } from "./types";

const PROVIDERS: ReadonlyArray<{ title: string; value: Provider }> = [
  { title: "OpenAI", value: "openai" },
  { title: "Perplexity", value: "perplexity" },
  { title: "Ollama", value: "ollama" },
];

const SEARCH_MODEL = "gpt-5-search-api";
const MIN_PROMPT_CHARS = 3;
const DEBOUNCE_MS = 1200;

const modelsFor = (provider: Provider): ReadonlyArray<ModelOption> =>
  MODELS_BY_PROVIDER[provider];

export default function Command(props: { arguments: ShellBuddyArguments }) {
  const { prompt: defaultPrompt } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();
  const {
    provider: defaultProvider = "openai",
    openaiModel = OPENAI_MODELS[0].value,
    ollamaModel = MODELS_BY_PROVIDER.ollama[0].value,
    webSearch: defaultWebSearch = false,
    apiKey,
    perplexityApiKey,
    openaiUrl,
    openaiModelCustom,
    ollamaUrl = "http://localhost:11434",
    ollamaApiKey,
    context7ApiKey,
    terminal = "auto",
  } = preferences;

  const [provider, setProvider] = useState<Provider>(defaultProvider);
  const [model, setModel] = useState<string>(
    provider === "ollama"
      ? ollamaModel
      : provider === "perplexity"
      ? MODELS_BY_PROVIDER.perplexity[0].value
      : openaiModel
  );
  const [webSearch, setWebSearch] = useState<boolean>(defaultWebSearch);
  const [history, setHistory] = usePersistentState<
    CommandHistoryItem[] | undefined
  >("history", undefined);
  const [prompt, setPrompt] = useState<string>(defaultPrompt ?? "");
  const [loading, setLoading] = useState<boolean>(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const models = modelsFor(provider);

  useEffect(() => {
    setModel(modelsFor(provider)[0].value);
    if (provider !== "openai" && webSearch) setWebSearch(false);
  }, [provider]);

  useEffect(() => {
    if (provider !== "openai") return;
    setModel(webSearch ? SEARCH_MODEL : OPENAI_MODELS[0].value);
  }, [webSearch, provider, setModel]);

  useEffect(() => {
    globalCache.clear();
  }, []);

  const appendToHistory = (p: string, command: string) => {
    setHistory((prev) =>
      prev ? [...prev, { prompt: p, command }] : [{ prompt: p, command }]
    );
  };

  const executeConversion = async (rawPrompt: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Converting Prompt",
    });
    setLoading(true);

    if (rawPrompt.length < 2) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = "Please enter a valid prompt";
      setLoading(false);
      return;
    }

    const lowerCasePrompt = rawPrompt.toLowerCase();
    const knownCommand = (await getKnownPrompts())[lowerCasePrompt];

    if (knownCommand) {
      appendToHistory(rawPrompt, knownCommand);
      toast.style = Toast.Style.Success;
      toast.title = "Known prompt retrieved";
      setLoading(false);
      return;
    }

    const result = await convertPrompt({
      prompt: rawPrompt,
      model,
      provider,
      webSearch,
      apiKeys: {
        openai: apiKey,
        perplexity: perplexityApiKey,
        ollama: ollamaApiKey,
        context7: context7ApiKey,
      },
      urls: { openaiUrl, ollamaUrl },
      customModels: { openai: openaiModelCustom },
    });

    if (result.success && result.command) {
      setPrompt("");
      appendToHistory(rawPrompt, result.command);
      await addKnownPrompt(lowerCasePrompt, result.command);
    }

    toast.style = result.success ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = result.title;
    if (result.message) toast.message = result.message;

    setLoading(false);
  };

  const reverseHistory = useMemo<CommandHistoryItem[] | undefined>(
    () => (history === undefined ? history : [...history].reverse()),
    [history]
  );

  useEffect(() => {
    if (defaultPrompt && defaultPrompt.length > 0)
      executeConversion(defaultPrompt);
  }, [defaultPrompt]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    // Allow search with minimal input when web search is enabled
    const minChars = webSearch ? 1 : MIN_PROMPT_CHARS;
    if (prompt.length >= minChars) {
      debounceTimer.current = setTimeout(
        () => executeConversion(prompt),
        DEBOUNCE_MS
      );
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [prompt, webSearch, provider, model]);

  const renderSearchBarAccessory = () => {
    if (prompt) return null;

    if (webSearch && provider === "openai") {
      // Show search toggle and provider when web search is active
      return (
        <List.Dropdown
          tooltip="Web Search / Provider"
          value={`search:${provider}`}
          onChange={(val) => {
            const [mode, prov] = val.split(":");
            if (mode === "search") {
              setWebSearch(true);
              setProvider(prov as Provider);
            } else if (mode === "regular") {
              setWebSearch(false);
              setProvider(prov as Provider);
            }
          }}
        >
          <List.Dropdown.Item
            title="GPT-5 Search (OpenAI)"
            value={`search:openai`}
          />
          {PROVIDERS.filter((p) => p.value === "openai").map((p) => (
            <List.Dropdown.Item
              key={`regular:${p.value}`}
              title={`${p.title} - Regular`}
              value={`regular:${p.value}`}
            />
          ))}
        </List.Dropdown>
      );
    }

    return (
      <List.Dropdown
        tooltip="Provider / Model"
        value={`${provider}:${model}`}
        onChange={(val) => {
          const [prov, mod] = val.split(":");
          setProvider(prov as Provider);
          setModel(mod);
        }}
      >
        {PROVIDERS.flatMap((p) =>
          modelsFor(p.value).map((m) => (
            <List.Dropdown.Item
              key={`${p.value}:${m.value}`}
              title={`${p.title} - ${m.title}`}
              value={`${p.value}:${m.value}`}
            />
          ))
        )}
        {provider === "openai" && (
          <List.Dropdown.Item
            title="OpenAI - GPT-5 Search"
            value={`${provider}:${SEARCH_MODEL}`}
          />
        )}
      </List.Dropdown>
    );
  };

  return (
    <List
      enableFiltering={false}
      onSearchTextChange={setPrompt}
      searchBarPlaceholder="Type a command description..."
      searchText={prompt}
      isLoading={loading}
      searchBarAccessory={renderSearchBarAccessory()}
      actions={
        <ActionPanel>
          <Action
            title="Convert Prompt"
            icon={Icon.Lowercase}
            onAction={() => executeConversion(prompt)}
          />
          <Action
            title={webSearch ? "Disable Web Search" : "Enable Web Search"}
            icon={webSearch ? Icon.CheckCircle : Icon.Circle}
            onAction={() => setWebSearch(!webSearch)}
          />
          <Action
            title="Change Provider or API Key"
            icon={Icon.Key}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={() => openCommandPreferences()}
          />
        </ActionPanel>
      }
    >
      {!reverseHistory?.length && (
        <List.Section title="Settings">
          <List.Item
            title={`Provider: ${
              PROVIDERS.find((p) => p.value === provider)?.title ?? provider
            }`}
            icon={Icon.Cloud}
            actions={
              <ActionPanel>
                {PROVIDERS.filter((p) => p.value !== provider).map((p) => (
                  <Action
                    key={p.value}
                    title={`Switch to ${p.title}`}
                    onAction={() => setProvider(p.value)}
                  />
                ))}
              </ActionPanel>
            }
          />
          {!webSearch && (
            <List.Item
              title={`Model: ${
                models.find((m) => m.value === model)?.title ?? model
              }`}
              icon={Icon.Gear}
              actions={
                <ActionPanel>
                  {models
                    .filter((m) => m.value !== model)
                    .map((m) => (
                      <Action
                        key={m.value}
                        title={`Switch to ${m.title}`}
                        onAction={() => setModel(m.value)}
                      />
                    ))}
                </ActionPanel>
              }
            />
          )}
          {webSearch && (
            <List.Item
              title="Model: GPT-5 Search"
              icon={Icon.Gear}
              subtitle="Locked while web search is enabled"
            />
          )}
          {provider === "openai" && (
            <List.Item
              title={
                webSearch ? "Web Search: Enabled 🌐" : "Web Search: Disabled"
              }
              icon={webSearch ? Icon.CheckCircle : Icon.Circle}
              actions={
                <ActionPanel>
                  <Action
                    title={
                      webSearch ? "Disable Web Search" : "Enable Web Search"
                    }
                    onAction={() => setWebSearch(!webSearch)}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}

      {!loading && !reverseHistory?.length && (
        <List.Item
          title="No history yet"
          subtitle="Type a prompt and press ↵"
          icon={Icon.Clock}
        />
      )}
      <List.Section title="Command History">
        {loading && (
          <List.Item
            title="Hang on, converting your prompt ..."
            icon={Icon.Terminal}
            subtitle={prompt}
          />
        )}
        {reverseHistory?.map((p, i) => (
          <List.Item
            title={p.command}
            icon={Icon.Terminal}
            subtitle={p.prompt}
            key={i}
            actions={
              <ActionPanel title="AI Shellsmith Actions">
                <Action.CopyToClipboard
                  title="Copy Command to Clipboard"
                  content={p.command}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <Action
                  title="Execute in Terminal"
                  icon={Icon.Terminal}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  onAction={() => {
                    closeMainWindow();
                    runCommandInDefaultTerminal(p.command, terminal);
                  }}
                />
                <Action
                  title="Execute & Copy Output"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={async () => {
                    const toast = await showToast({
                      style: Toast.Style.Animated,
                      title: "Executing command...",
                    });
                    try {
                      const output = executeAndCaptureOutput(p.command);
                      await Clipboard.copy(output);
                      toast.style = Toast.Style.Success;
                      toast.title = "Output Copied";
                      toast.message = `${output.split("\n").length} line(s)`;
                    } catch {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Execution Failed";
                    }
                  }}
                />
                <Action
                  title="Delete from History"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                  onAction={() => {
                    const historyIndex = history?.indexOf(p);
                    if (historyIndex !== undefined && historyIndex !== -1) {
                      setHistory((prev) =>
                        prev?.filter((_, idx) => idx !== historyIndex)
                      );
                    }
                  }}
                />
                <Action
                  title="Change Provider or API Key"
                  icon={Icon.Key}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                  onAction={() => openCommandPreferences()}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
