import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";

interface MempoolBlock {
  id: string;
  height: number;
  timestamp: number;
}

function relativeAge(unixTime: number): string {
  const now = Date.now() / 1000;
  const diff = now - unixTime;

  if (diff < 0) return "in the future";
  if (diff < 60) return `${Math.floor(diff)} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
  return `${Math.floor(diff / 31536000)} years ago`;
}

function formatDate(unixTime: number): string {
  return new Date(unixTime * 1000).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "long",
  });
}

async function fetchBlock(height: number): Promise<MempoolBlock> {
  const hashRes = await fetch(
    `https://mempool.space/api/block-height/${height}`,
  );
  if (!hashRes.ok) {
    throw new Error(`Block height ${height} not found (${hashRes.status})`);
  }
  const hash = await hashRes.text();

  const blockRes = await fetch(`https://mempool.space/api/block/${hash}`);
  if (!blockRes.ok) {
    throw new Error(`Failed to fetch block ${hash} (${blockRes.status})`);
  }
  return blockRes.json();
}

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
