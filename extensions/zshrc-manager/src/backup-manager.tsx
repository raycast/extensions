/**
 * Backup Manager
 *
 * Provides a UI for managing zshrc backup files:
 * - View backup info (timestamp, size)
 * - Compare backup vs current file
 * - Restore from backup
 * - Delete backup
 */

import { useState, useEffect, useCallback, type ReactElement } from "react";
import { List, ActionPanel, Action, Icon, Detail, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import {
  getBackupInfo,
  getBackupPath,
  getZshrcPath,
  readBackupFile,
  readZshrcFile,
  restoreFromBackup,
  deleteBackup,
  type BackupInfo,
} from "./lib/zsh";
import { computeDiff } from "./utils/diff";
import { clearCache } from "./lib/cache";
import { MODERN_COLORS } from "./constants";

interface BackupManagerProps {
  searchBarAccessory?: ReactElement | null;
}

/**
 * Backup Manager view component
 */
export default function BackupManager({ searchBarAccessory }: BackupManagerProps) {
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBackupInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await getBackupInfo();
      setBackupInfo(info);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Backup Info",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackupInfo();
  }, [loadBackupInfo]);

  const handleRestore = async () => {
    const confirmed = await confirmAlert({
      title: "Restore from Backup?",
      message: `This will restore your zshrc from the backup file at ${getBackupPath()}. Your current configuration will be overwritten.`,
      primaryAction: {
        title: "Restore",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await restoreFromBackup();
        clearCache(getZshrcPath());
        await showToast({
          style: Toast.Style.Success,
          title: "Backup Restored",
          message: "Your zshrc has been restored from backup",
        });
        await loadBackupInfo();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Restore Failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete Backup?",
      message: "This will permanently delete the backup file. You cannot undo this action.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteBackup();
        await showToast({
          style: Toast.Style.Success,
          title: "Backup Deleted",
          message: "The backup file has been removed",
        });
        await loadBackupInfo();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Delete Failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  // No backup exists
  if (!isLoading && (!backupInfo || !backupInfo.exists)) {
    return (
      <List
        navigationTitle="Backup Manager"
        isLoading={isLoading}
        searchBarAccessory={searchBarAccessory as List.Props["searchBarAccessory"]}
      >
        <List.EmptyView
          title="No Backup Found"
          description="A backup is created automatically when you make changes to your zshrc file."
          icon={Icon.Clock}
        />
      </List>
    );
  }

  const formattedDate = backupInfo?.modifiedAt
    ? backupInfo.modifiedAt.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown";

  const timeSinceBackup = backupInfo?.modifiedAt ? getTimeSince(backupInfo.modifiedAt) : "Unknown";

  return (
    <List
      navigationTitle="Backup Manager"
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={searchBarAccessory as List.Props["searchBarAccessory"]}
    >
      <List.Section title="Backup File">
        <List.Item
          title="Current Backup"
          icon={{ source: Icon.Clock, tintColor: MODERN_COLORS.primary }}
          accessories={[{ text: timeSinceBackup }]}
          detail={
            <List.Item.Detail
              markdown={`
# Backup File

Your zshrc backup contains the previous version of your configuration file. It is automatically created whenever you make changes through Zshrc Manager.

## Backup Information

| Property | Value |
|----------|-------|
| **Location** | \`${backupInfo?.path}\` |
| **Size** | ${backupInfo?.sizeFormatted} |
| **Last Modified** | ${formattedDate} |

## Actions

- **View Diff**: Compare the backup with your current configuration
- **Restore**: Replace your current zshrc with this backup
- **Delete**: Remove the backup file

## How Backups Work

Zshrc Manager automatically creates a backup before any write operation. Only one backup is maintained at a time (the most recent one).

If something goes wrong after making changes, you can restore from this backup to recover your previous configuration.
              `}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Path"
                    text={backupInfo?.path ?? "Unknown"}
                    icon={{ source: Icon.Document, tintColor: MODERN_COLORS.neutral }}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Size"
                    text={backupInfo?.sizeFormatted ?? "Unknown"}
                    icon={{ source: Icon.HardDrive, tintColor: MODERN_COLORS.neutral }}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Last Modified"
                    text={formattedDate}
                    icon={{ source: Icon.Calendar, tintColor: MODERN_COLORS.neutral }}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Time Since Backup"
                    text={timeSinceBackup}
                    icon={{ source: Icon.Clock, tintColor: MODERN_COLORS.primary }}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push title="View Diff" icon={Icon.Switch} target={<BackupDiffView onRestore={handleRestore} />} />
              <Action
                title="Restore from Backup"
                icon={Icon.Undo}
                onAction={handleRestore}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
              <Action.Open title="Open Backup File" target={backupInfo?.path ?? getBackupPath()} icon={Icon.Document} />
              <ActionPanel.Section>
                <Action
                  title="Delete Backup"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={handleDelete}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadBackupInfo}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

/**
 * Diff view showing changes between backup and current file
 */
function BackupDiffView({ onRestore }: { onRestore: () => Promise<void> }) {
  const [diffMarkdown, setDiffMarkdown] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDiff() {
      setIsLoading(true);
      try {
        const [backupContent, currentContent] = await Promise.all([readBackupFile(), readZshrcFile()]);

        if (!backupContent) {
          setDiffMarkdown("# No Backup Found\n\nUnable to load backup file content.");
          return;
        }

        const diff = computeDiff(backupContent, currentContent);

        if (!diff.hasChanges) {
          setDiffMarkdown(`
# No Changes

The backup file is identical to your current configuration.

This typically happens when:
- You just restored from backup
- No changes have been made since the backup was created
          `);
        } else {
          setDiffMarkdown(`
# Backup vs Current Configuration

${diff.markdown}

## Summary
- **Lines Added**: ${diff.additions}
- **Lines Removed**: ${diff.deletions}

---

*The diff shows what changed from the backup (old) to your current file (new).*
*Use "Restore from Backup" to revert to the backup version.*
          `);
        }
      } catch (error) {
        setDiffMarkdown(`
# Error Loading Diff

Failed to compare files: ${error instanceof Error ? error.message : "Unknown error"}
        `);
      } finally {
        setIsLoading(false);
      }
    }

    loadDiff();
  }, []);

  return (
    <Detail
      navigationTitle="Backup Diff"
      isLoading={isLoading}
      markdown={diffMarkdown}
      actions={
        <ActionPanel>
          <Action title="Restore from Backup" icon={Icon.Undo} onAction={onRestore} />
          <Action.CopyToClipboard
            title="Copy Diff"
            content={diffMarkdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

/**
 * Gets a human-readable time since string
 */
function getTimeSince(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }
  if (diffHours > 0) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  if (diffMins > 0) {
    return diffMins === 1 ? "1 minute ago" : `${diffMins} minutes ago`;
  }
  return "Just now";
}
