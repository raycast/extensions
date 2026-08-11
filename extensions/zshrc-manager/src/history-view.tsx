/**
 * History View
 *
 * Provides a UI for viewing and managing zshrc change history:
 * - List all history entries with timestamps and descriptions
 * - Undo to any specific point
 * - Clear all history
 * - Copy history to clipboard
 */

import { useState, useEffect, useCallback } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert, Clipboard } from "@raycast/api";
import { getHistory, undoToPoint, clearHistory, type HistoryEntry } from "./lib/history";
import { MODERN_COLORS } from "./constants";

interface HistoryViewProps {
  onRefresh?: (() => void) | undefined;
}

/**
 * History View component showing all change history
 */
export default function HistoryView({ onRefresh }: HistoryViewProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const entries = await getHistory();
      setHistory(entries);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load History",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleUndoToPoint = async (index: number) => {
    const entry = history[index];
    if (!entry) return;

    const changesCount = index + 1;
    const confirmed = await confirmAlert({
      title: `Undo ${changesCount} Change${changesCount > 1 ? "s" : ""}?`,
      message: `This will restore your zshrc to the state before "${entry.description}". ${changesCount > 1 ? `All ${changesCount} changes since then will be reverted.` : ""}`,
      primaryAction: {
        title: "Undo",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const success = await undoToPoint(index);
      if (success) {
        await loadHistory();
        onRefresh?.();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Undo Failed",
          message: "Unable to restore to this history point",
        });
      }
    }
  };

  const handleClearHistory = async () => {
    const confirmed = await confirmAlert({
      title: "Clear All History?",
      message: "This will permanently delete all history entries. You will not be able to undo any previous changes.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await clearHistory();
      await showToast({
        style: Toast.Style.Success,
        title: "History Cleared",
        message: "All history entries have been removed",
      });
      await loadHistory();
    }
  };

  const handleCopyHistory = async () => {
    if (history.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No History",
        message: "Nothing to copy",
      });
      return;
    }

    const historyText = history
      .map((entry, idx) => {
        const date = new Date(entry.timestamp);
        return `${idx + 1}. ${date.toLocaleString()} - ${entry.description}`;
      })
      .join("\n");

    await Clipboard.copy(historyText);
    await showToast({
      style: Toast.Style.Success,
      title: "History Copied",
      message: `${history.length} entries copied to clipboard`,
    });
  };

  // Empty state
  if (!isLoading && history.length === 0) {
    return (
      <List navigationTitle="Change History" isLoading={isLoading}>
        <List.EmptyView
          title="No History"
          description="Changes you make to your zshrc will appear here, allowing you to undo them."
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadHistory} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List navigationTitle="Change History" isLoading={isLoading} isShowingDetail>
      <List.Section title={`Recent Changes (${history.length})`} subtitle="Newest first">
        {history.map((entry, index) => (
          <HistoryListItem
            key={`${entry.timestamp}-${index}`}
            entry={entry}
            index={index}
            totalEntries={history.length}
            onUndoToPoint={() => handleUndoToPoint(index)}
            onCopyHistory={handleCopyHistory}
            onClearHistory={handleClearHistory}
            onRefresh={loadHistory}
          />
        ))}
      </List.Section>
    </List>
  );
}

interface HistoryListItemProps {
  entry: HistoryEntry;
  index: number;
  totalEntries: number;
  onUndoToPoint: () => void;
  onCopyHistory: () => void;
  onClearHistory: () => void;
  onRefresh: () => void;
}

function HistoryListItem({
  entry,
  index,
  totalEntries,
  onUndoToPoint,
  onCopyHistory,
  onClearHistory,
  onRefresh,
}: HistoryListItemProps) {
  const date = new Date(entry.timestamp);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const fullDateStr = date.toLocaleString();
  const isFirst = index === 0;
  const changesCount = index + 1;

  // Calculate content stats
  const lines = entry.previousContent.split("\n").length;
  const chars = entry.previousContent.length;

  return (
    <List.Item
      title={entry.description}
      icon={{
        source: isFirst ? Icon.Clock : Icon.CircleFilled,
        tintColor: isFirst ? MODERN_COLORS.primary : MODERN_COLORS.neutral,
      }}
      accessories={[{ text: timeStr }, { text: dateStr }]}
      detail={
        <List.Item.Detail
          markdown={`
# ${entry.description}

## Change Details

| Property | Value |
|----------|-------|
| **Time** | ${fullDateStr} |
| **File** | \`${entry.filePath}\` |
| **Changes to Revert** | ${changesCount} |

## Content Before This Change

The content below shows what your zshrc looked like **before** this change was made.

\`\`\`zsh
${entry.previousContent.slice(0, 2000)}${entry.previousContent.length > 2000 ? "\n... (truncated)" : ""}
\`\`\`

---

*Undo this change to restore the content shown above.*
          `}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Description"
                text={entry.description}
                icon={{ source: Icon.Pencil, tintColor: MODERN_COLORS.primary }}
              />
              <List.Item.Detail.Metadata.Label
                title="Timestamp"
                text={fullDateStr}
                icon={{ source: Icon.Calendar, tintColor: MODERN_COLORS.neutral }}
              />
              <List.Item.Detail.Metadata.Label
                title="File"
                text={entry.filePath}
                icon={{ source: Icon.Document, tintColor: MODERN_COLORS.neutral }}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Previous Content"
                text={`${lines} lines, ${chars} characters`}
                icon={{ source: Icon.Text, tintColor: MODERN_COLORS.neutral }}
              />
              <List.Item.Detail.Metadata.Label
                title="Position in History"
                text={`${index + 1} of ${totalEntries}`}
                icon={{ source: Icon.List, tintColor: MODERN_COLORS.neutral }}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={isFirst ? "Undo This Change" : `Undo ${changesCount} Changes`}
            icon={Icon.Undo}
            onAction={onUndoToPoint}
          />
          <Action.CopyToClipboard
            title="Copy Previous Content"
            content={entry.previousContent}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <ActionPanel.Section>
            <Action
              title="Copy All History"
              icon={Icon.Clipboard}
              onAction={onCopyHistory}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Clear All History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={onClearHistory}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
