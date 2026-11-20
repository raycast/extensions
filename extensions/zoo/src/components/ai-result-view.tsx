import { Action, ActionPanel, Detail, Form, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { TokenUsage, describeError, estimateCost, providers, resolveSettings } from "../ai/config";
import { streamAnswer } from "../ai/stream";
import { AIConnectionView } from "./ai-connection-view";

interface AIResultViewProps {
  content: string;
  selectedText: string;
}

export function AIResultView({ content, selectedText }: AIResultViewProps) {
  const [input, setInput] = useState(selectedText);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<TokenUsage>();
  const [attempt, setAttempt] = useState(0);
  const [controller, setController] = useState<AbortController>();
  const preferences = useMemo(() => getPreferenceValues<Preferences>(), [attempt]);
  let settings: ReturnType<typeof resolveSettings> | undefined;
  let configurationError = "";
  try {
    settings = resolveSettings(preferences);
  } catch (error) {
    configurationError = describeError(error);
  }
  const cost = estimateCost(usage, preferences.priceinput, preferences.priceoutput);

  useEffect(() => {
    if (!input.trim()) return;
    const abortController = new AbortController();
    setController(abortController);
    setResponse("");
    setError("");
    setUsage(undefined);
    setLoading(true);

    async function ask() {
      try {
        await streamAnswer({
          settings: resolveSettings(preferences),
          apiKey: preferences.apikey,
          prompt: content,
          input,
          signal: abortController.signal,
          onUpdate: (update) => {
            if (abortController.signal.aborted) return;
            if (update.text !== undefined) setResponse(update.text);
            if (update.usage) setUsage(update.usage);
          },
        });
      } catch (error) {
        if (!abortController.signal.aborted) setError(describeError(error));
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    }

    ask();
    return () => abortController.abort();
  }, [content, input, preferences]);

  if (!input.trim()) {
    return (
      <Form
        navigationTitle="Enter Text for Prompt"
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Ask AI" onSubmit={(values: { text: string }) => setInput(values.text)} />
          </ActionPanel>
        }
      >
        <Form.Description text="No selected text was available. Enter or paste the text to process with this Gist prompt." />
        <Form.TextArea id="text" title="Text" placeholder="Enter the text to process." />
      </Form>
    );
  }

  const message = error || configurationError;
  return (
    <Detail
      navigationTitle="AI Result"
      markdown={`${response || (loading ? "The AI is preparing a response…" : "")}${message ? `\n\n**The request could not be completed.**\n\n${message}` : ""}`}
      isLoading={loading}
      actions={
        <ActionPanel>
          {response && <Action.CopyToClipboard title="Copy Result" content={response} />}
          {response && <Action.Paste title="Paste Result" content={response} />}
          {loading ? (
            <Action
              title="Stop Generating"
              icon={Icon.Stop}
              onAction={() => {
                controller?.abort();
                setLoading(false);
                setError("The request was stopped. You can retry with the same text and prompt.");
              }}
            />
          ) : (
            <Action
              title="Retry"
              icon={Icon.Repeat}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => setAttempt((value) => value + 1)}
            />
          )}
          <Action title="Open AI Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.Push
            title="Check AI Connection"
            icon={Icon.Network}
            target={<AIConnectionView navigationTitle="AI Connection Check" />}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Provider"
            text={settings ? providers[settings.provider].name : "Check AI settings"}
          />
          <Detail.Metadata.Label title="Model" text={settings?.model || "Check AI settings"} />
          <Detail.Metadata.Label title="Input Tokens" text={usage ? String(usage.inputTokens) : "Not reported"} />
          <Detail.Metadata.Label title="Output Tokens" text={usage ? String(usage.outputTokens) : "Not reported"} />
          <Detail.Metadata.Label
            title="Estimated Cost (USD)"
            text={cost === undefined ? "Set both token prices to estimate" : `$${cost.toFixed(6)}`}
          />
        </Detail.Metadata>
      }
    />
  );
}
