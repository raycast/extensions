process.noDeprecation = true;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Detail, ActionPanel, Action, Icon } = require("@raycast/api");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { usePromise } = require("@raycast/utils");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useRef } = require("react");

import { fetchBlock } from "./api";
import { relativeAge, formatDate } from "./utils";

export default function Command({
  arguments: { height },
}: {
  arguments: { height: string };
}) {
  const heightNum = parseInt(height.replace(/,/g, ""), 10);
  const abortable = useRef<AbortController>();

  const {
    isLoading,
    data: block,
    error,
  } = usePromise(fetchBlock, [heightNum], {
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

  if (error || !block) {
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
