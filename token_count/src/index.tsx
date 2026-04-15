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
        markdown="# TokenCount

> Dehydrate code for compact AI context

📋 **Clipboard is empty**

Please copy some code or text first, then run this extension."""
        action={
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
      value: `**${result.savedPercent}%** 🎉`,
    },
  ] : [];

  // Generate variable mapping section
  const variableMapSection =
    result && result.variableMap.size > 0 ? (
      <Detail.Metadata.Label
        key="variables"
        title="Variable Mapping"
        value={
          <Detail.Metadata.Link
            title="View mapping table"
            target={`data:image/png;base64,${btoa(
              Array.from(result.variableMap.entries())
                .map(([k, v]) => `${k} → ${v}`)
                .join("\n")
            )}`}
          />
        }
      />
    ) : null;

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
          {metadata.map((item, index) => (
            <Detail.Metadata.Label
              key={index}
              label={item.label}
              value={
                item.value.includes("**") ? (
                  <Detail.Metadata.JumpTo
                    value={`🎉 ${result?.savedPercent}%`}
                  />
                ) : (
                  item.value
                )
              }
            />
          ))}
          {variableMapSection}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {/* Enter: Copy compressed result */}
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
              icon="🌐"
            />
            <Action.OpenInBrowser
              title="Follow Twitter"
              url="https://x.com/norike0718"
              icon="𝕏"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}