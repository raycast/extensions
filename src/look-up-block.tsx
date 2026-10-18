process.noDeprecation = true;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Detail, ActionPanel, Action, Icon } = require("@raycast/api");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { usePromise } = require("@raycast/utils");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useRef } = require("react");

import { resolveBlock } from "./lib/api";
import { relativeAge, formatDate } from "./lib/utils";

export default function Command({
  arguments: { height },
}: {
  arguments: { height: string };
}) {
  const heightNum = parseInt(height.replace(/,/g, ""), 10);
  const abortable = useRef<AbortController>();

  const {
    isLoading,
    data: result,
    error,
  } = usePromise(resolveBlock, [heightNum], {
    abortable,
    execute: !isNaN(heightNum) && heightNum > 0,
  });

  if (isNaN(heightNum) || heightNum <= 0) {
    return (
      <Detail
        markdown="## Invalid block height\n\nPlease enter a valid positive integer."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Search on Mempool"
              url="https://mempool.space"
            />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading) {
    return <Detail isLoading markdown="## Fetching block data…" />;
  }

  if (error || !result) {
    return (
      <Detail
        markdown={`## Block not found\n\n${error?.message || `No block found at height **${heightNum}**.`}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Search on Mempool"
              url="https://mempool.space"
            />
          </ActionPanel>
        }
      />
    );
  }

  if (result.kind === "estimate") {
    const ts = result.timestamp;
    const formattedDate = formatDate(ts);
    const age = relativeAge(ts);
    const now = Math.floor(Date.now() / 1000);
    const blocksAhead = result.height - Math.round((now - ts) / 600);

    const markdown = `
## ⚠️ Block #${result.height.toLocaleString()} (Estimated)

| Field | Value |
|---|---|
| **Estimated Time** | ${formattedDate} |
| **Estimated Age** | ${age} |
| **Estimated Unix Timestamp** | ${ts} |
| **Reference** | Based on block #${blocksAhead.toLocaleString()} and 10 min average interval |
    `;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Copy">
              <Action.CopyToClipboard
                title="Copy Estimated Timestamp"
                content={String(ts)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              />
              <Action.CopyToClipboard
                title="Copy Formatted Date"
                content={formattedDate}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              />
              <Action.CopyToClipboard
                title="Copy Block Height"
                content={String(result.height)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  const block = result.block;
  const formattedDate = formatDate(block.timestamp);
  const age = relativeAge(block.timestamp);
  const mempoolUrl = `https://mempool.space/block/${block.id}`;

  const markdown = `
## Block #${block.height.toLocaleString()}

| Field | Value |
|---|---|
| **Hash** | \`${block.id}\` |
| **Mined** | ${formattedDate} |
| **Age** | ${age} |
| **Unix Timestamp** | ${block.timestamp} |
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open on Mempool"
            url={mempoolUrl}
            icon={Icon.Globe}
          />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Unix Timestamp"
              content={String(block.timestamp)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
            <Action.CopyToClipboard
              title="Copy Formatted Date"
              content={formattedDate}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
            <Action.CopyToClipboard
              title="Copy Block Hash"
              content={block.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
            />
            <Action.CopyToClipboard
              title="Copy Block Height"
              content={String(block.height)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
