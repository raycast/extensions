import { useState, useEffect } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  CopyToClipboardAction,
  open,
  Clipboard,
  showToast,
  Toast,
} from "@raycast/api";
import { dehydrate, DehydratorResult } from "./dehydrator";

export default function Command() {
  const [result, setResult] = useState<DehydratorResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    processClipboard();
  }, []);

  async function processClipboard() {
    setIsLoading(true);
    setError(null);

    try {
      const clipboardText = await Clipboard.readText();

      if (!clipboardText || clipboardText.trim().length === 0) {
        setResult(null);
        setIsLoading(false);
        return;
      }

      const dehydrateResult = await dehydrate(clipboardText);
      setResult(dehydrateResult);
    } catch (err) {
      setError("Error processing clipboard content");
      showToast({
        style: Toast.Style.Failure,
        title: "Processing failed",
        message: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Empty state: clipboard has no content
  if (!result && !isLoading) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={`# TokenCount

> Dehydrate code for compact AI context

📋 **Clipboard is empty**

Please copy some code or text first, then run this extension.`}
        actions={
          <ActionPanel>
            <Action
              title="Re-check clipboard"
              onAction={processClipboard}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Generate metadata sidebar content
  const metadata = result ? [
    { label: "Original length", value: `${result.originalLength} chars` },
    { label: "Compressed", value: `${result.compressedLength} chars` },
    {
      label: "Saved",
      value: `${result.savedPercent}%`,
    },
  ] : [];

  // Variable Map 详情展示
  let variableMapMarkdown = "";
  if (result && result.variableMap.size > 0) {
    variableMapMarkdown =
      "\n\n---\n\n### 📍 Variable Mapping\n\n| 原始 | 压缩 |" +
      "\n|------|------|" +
      Array.from(result.variableMap.entries())
        .map(([original, short]) => `| ${original} | ${short} |`)
        .join("\n");
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# TokenCount

${result?.markdown || ""}${variableMapMarkdown}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Original length" text={result ? `${result.originalLength} chars` : ""} />
          <Detail.Metadata.Label title="Compressed" text={result ? `${result.compressedLength} chars` : ""} />
          <Detail.Metadata.Label title="Saved" text={result ? `${result.savedPercent}%` : ""} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <CopyToClipboardAction
            title="Copy compressed result"
            content={result?.markdown || ""}
            onCopy={() => {
              showToast({
                style: Toast.Style.Success,
                title: "Copied to clipboard",
              });
            }}
          />

          <ActionPanel.Section>
            <Action
              title="Re-process clipboard"
              icon="🔄"
              onAction={processClipboard}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="JustinXai Labs">
            <Action.OpenInBrowser
              title="Website"
              url="https://github.com/JustinXaiDev/token-guard-raycast"
            />
            <Action.OpenInBrowser
              title="Follow Twitter"
              url="https://x.com/norike0718"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}