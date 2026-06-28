/**
 * Shared action components for zshrc manager
 *
 * Provides reusable action components including:
 * - Undo last change
 * - Restore from backup
 * - Copy to clipboard
 * - Refresh
 * - Open file
 * - View history
 */

import { Action, ActionPanel, Icon, showToast, Toast, confirmAlert, Alert, Clipboard } from "@raycast/api";
import { undoLastChange, getHistory, getUndoCount } from "./history";
import { restoreFromBackup, getZshrcPath, getBackupPath } from "./zsh";
import { clearCache } from "./cache";
import { useEffect, useState } from "react";
import HistoryView from "../history-view";

interface SharedActionsProps {
  /** Callback to refresh the view after changes */
  onRefresh?: () => void;
  /** Whether to show undo action */
  showUndo?: boolean;
  /** Whether to show backup restore action */
  showBackupRestore?: boolean;
  /** Value to copy (if any) */
  copyValue?: string;
  /** Label for the copy action */
  copyLabel?: string;
}

/**
 * Undo action component
 */
export function UndoAction({ onRefresh }: { onRefresh?: () => void }) {
  const [undoCount, setUndoCount] = useState(0);

  useEffect(() => {
    getUndoCount().then(setUndoCount);
  }, []);

  if (undoCount === 0) {
    return null;
  }

  return (
    <Action
      title={`Undo Last Change (${undoCount} Available)`}
      icon={Icon.Undo}
      shortcut={{ modifiers: ["cmd"], key: "z" }}
      onAction={async () => {
        const success = await undoLastChange();
        if (success) {
          onRefresh?.();
          setUndoCount((prev) => Math.max(0, prev - 1));
        }
      }}
    />
  );
}

/**
 * Backup restore action component
 */
export function BackupRestoreAction({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <Action
      title="Restore from Backup"
      icon={Icon.Clock}
      shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
      onAction={async () => {
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
            onRefresh?.();
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Restore Failed",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }}
    />
  );
}

/**
 * Copy action component
 */
export function CopyAction({ value, label = "Copy" }: { value: string; label?: string }) {
  return (
    <Action
      title={label}
      icon={Icon.Clipboard}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
      onAction={async () => {
        await Clipboard.copy(value);
        await showToast({
          style: Toast.Style.Success,
          title: "Copied",
          message: value.length > 50 ? value.slice(0, 47) + "..." : value,
        });
      }}
    />
  );
}

/**
 * View history action - navigates to history view
 */
export function ViewHistoryAction({ onRefresh }: { onRefresh?: (() => void) | undefined }) {
  return (
    <Action.Push
      title="View Change History"
      icon={Icon.List}
      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
      target={<HistoryView onRefresh={onRefresh} />}
    />
  );
}

/**
 * Copy history action - copies history to clipboard (legacy behavior)
 */
export function CopyHistoryAction() {
  return (
    <Action
      title="Copy History to Clipboard"
      icon={Icon.Clipboard}
      onAction={async () => {
        const history = await getHistory();
        if (history.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No History",
            message: "No changes have been recorded yet",
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
      }}
    />
  );
}

/**
 * Source config action - copies source command to clipboard
 */
export function SourceConfigAction() {
  const zshrcPath = getZshrcPath();
  const sourceCommand = `source ${zshrcPath}`;

  return (
    <Action
      title="Copy Source Command"
      icon={Icon.Terminal}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      onAction={async () => {
        await Clipboard.copy(sourceCommand);
        await showToast({
          style: Toast.Style.Success,
          title: "Source Command Copied",
          message: "Paste in terminal to reload your config",
        });
      }}
    />
  );
}

/**
 * Shared actions panel section
 *
 * Provides a reusable set of actions for zshrc management.
 * Include this in your ActionPanel to add undo, backup, and utility actions.
 */
export function SharedActionsSection({
  onRefresh,
  showUndo = true,
  showBackupRestore = true,
  copyValue,
  copyLabel,
}: SharedActionsProps) {
  return (
    <ActionPanel.Section title="Tools">
      {copyValue && <CopyAction value={copyValue} label={copyLabel ?? "Copy"} />}
      {showUndo && onRefresh && <UndoAction onRefresh={onRefresh} />}
      {showBackupRestore && onRefresh && <BackupRestoreAction onRefresh={onRefresh} />}
      <ViewHistoryAction onRefresh={onRefresh} />
      <SourceConfigAction />
      {onRefresh && (
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
      )}
      <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
    </ActionPanel.Section>
  );
}

/**
 * Standard actions for item management
 *
 * Use this for list items that can be edited/deleted.
 */
export function ItemActionsSection({
  onEdit,
  onDelete,
  onToggle,
  isEnabled = true,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  onToggle?: () => void;
  isEnabled?: boolean;
}) {
  return (
    <ActionPanel.Section title="Item Actions">
      {onEdit && (
        <Action title="Edit" icon={Icon.Pencil} shortcut={{ modifiers: ["cmd"], key: "e" }} onAction={onEdit} />
      )}
      {onToggle && (
        <Action
          title={isEnabled ? "Disable" : "Enable"}
          icon={isEnabled ? Icon.EyeDisabled : Icon.Eye}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={onToggle}
        />
      )}
      {onDelete && (
        <Action
          title="Delete"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
          onAction={onDelete}
        />
      )}
    </ActionPanel.Section>
  );
}
