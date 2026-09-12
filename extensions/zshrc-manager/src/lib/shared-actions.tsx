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
import { createContext, useContext, useEffect, useState } from "react";
import HistoryView from "../history-view";

/**
 * Detail pane toggle state provided by list surfaces (home, focused
 * views). When present, every action panel built from
 * SharedActionsSection gains a "Show/Hide Detail" action (⌘⇧D) without
 * each view having to thread the state through its action generators.
 */
export const DetailToggleContext = createContext<{ shown: boolean; toggle: () => void } | null>(null);

/**
 * Show/Hide Detail action (⌘⇧D), rendered when a surface provides
 * DetailToggleContext
 */
function ToggleDetailAction() {
  const detailToggle = useContext(DetailToggleContext);
  if (!detailToggle) {
    return null;
  }
  return (
    <Action
      title={detailToggle.shown ? "Hide Detail" : "Show Detail"}
      icon={Icon.Sidebar}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      onAction={detailToggle.toggle}
    />
  );
}

/**
 * Item-level actions carried by SharedActionsSection.
 *
 * Every surface that shows an entry passes what it can here, so the full
 * action set (Edit, Delete, Copy Value, Copy Name, Open Zshrc, Refresh)
 * renders consistently and no view can ship a partial set.
 */
export interface ItemActions {
  /** Form element to push for editing (e.g. <EditAlias …/>) */
  editTarget?: React.ReactNode | undefined;
  /** Title for the edit action (defaults to "Edit") */
  editTitle?: string | undefined;
  /** Handler that deletes the item (confirmation handled by the callee) */
  onDelete?: (() => void | Promise<void>) | undefined;
  /** Title for the delete action (defaults to "Delete") */
  deleteTitle?: string | undefined;
  /** Value copied by Copy Value (⌘C) — always the real, unmasked value */
  copyValue?: string | undefined;
  /** Name copied by Copy Name (⌘⇧C) */
  copyName?: string | undefined;
  /** Full definition line offered as Copy Definition */
  copyDefinition?: string | undefined;
  /** Whether the item's value is masked as a secret */
  isSecret?: boolean | undefined;
  /** Whether a secret value is currently revealed */
  revealed?: boolean | undefined;
  /** Toggles reveal/hide for a secret value (⌘U) */
  onToggleReveal?: (() => void) | undefined;
  /** Called when the user acts on the item (frecency tracking) */
  onVisit?: (() => void) | undefined;
}

interface SharedActionsProps {
  /** Callback to refresh the view after changes */
  onRefresh?: () => void;
  /** Whether to show undo action */
  showUndo?: boolean;
  /** Whether to show backup restore action */
  showBackupRestore?: boolean;
  /** Whether to show the view-history action (home surfaces it as a Tool) */
  showHistory?: boolean;
  /** Item-level actions rendered ahead of the tools section */
  item?: ItemActions;
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
 * Copies an item's value (⌘C) — always the real value, even when the
 * displayed value is masked as a secret. Secrets are copied concealed (kept
 * out of clipboard managers) and never echoed in the toast.
 */
export function CopyValueAction({
  value,
  isSecret = false,
  onCopy,
}: {
  value: string;
  isSecret?: boolean | undefined;
  onCopy?: (() => void) | undefined;
}) {
  return (
    <Action
      title="Copy Value"
      icon={Icon.Clipboard}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
      onAction={async () => {
        onCopy?.();
        await Clipboard.copy(value, { concealed: isSecret });
        await showToast({
          style: Toast.Style.Success,
          title: "Value Copied",
          ...(isSecret ? {} : { message: value.length > 50 ? value.slice(0, 47) + "..." : value }),
        });
      }}
    />
  );
}

/**
 * Copies an item's name (⌘⇧C)
 */
export function CopyNameAction({ name, onCopy }: { name: string; onCopy?: (() => void) | undefined }) {
  return (
    <Action
      title="Copy Name"
      icon={Icon.Clipboard}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      onAction={async () => {
        onCopy?.();
        await Clipboard.copy(name);
        await showToast({
          style: Toast.Style.Success,
          title: "Name Copied",
          message: name,
        });
      }}
    />
  );
}

/**
 * Reveals or hides a masked secret value (⌘U)
 */
export function RevealValueAction({ revealed, onToggle }: { revealed: boolean; onToggle: () => void }) {
  return (
    <Action
      title={revealed ? "Hide Value" : "Reveal Value"}
      icon={revealed ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{ modifiers: ["cmd"], key: "u" }}
      onAction={onToggle}
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
  showHistory = true,
  item,
}: SharedActionsProps) {
  return (
    <>
      {item && (
        <ActionPanel.Section title="Item">
          {item.editTarget && (
            <Action.Push
              title={item.editTitle ?? "Edit"}
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={item.editTarget}
              onPush={() => item.onVisit?.()}
            />
          )}
          {item.copyValue !== undefined && (
            <CopyValueAction value={item.copyValue} isSecret={item.isSecret} onCopy={item.onVisit} />
          )}
          {item.copyName !== undefined && <CopyNameAction name={item.copyName} onCopy={item.onVisit} />}
          {item.copyDefinition !== undefined && (
            <Action
              title="Copy Definition"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              onAction={async () => {
                item.onVisit?.();
                // The definition embeds the value, so secrets stay concealed here too
                await Clipboard.copy(item.copyDefinition!, { concealed: item.isSecret ?? false });
                await showToast({ style: Toast.Style.Success, title: "Definition Copied" });
              }}
            />
          )}
          {item.isSecret && item.onToggleReveal && (
            <RevealValueAction revealed={item.revealed ?? false} onToggle={item.onToggleReveal} />
          )}
          {item.onDelete && (
            <Action
              title={item.deleteTitle ?? "Delete"}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                item.onVisit?.();
                await item.onDelete?.();
              }}
            />
          )}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Tools">
        {/* Safe actions lead: on panels without an Item section, the first
            action is the Enter default, and Enter must never rewrite the file */}
        <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
        {onRefresh && (
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        )}
        <ToggleDetailAction />
        {showUndo && onRefresh && <UndoAction onRefresh={onRefresh} />}
        {showBackupRestore && onRefresh && <BackupRestoreAction onRefresh={onRefresh} />}
        {showHistory && <ViewHistoryAction onRefresh={onRefresh} />}
        <SourceConfigAction />
      </ActionPanel.Section>
    </>
  );
}
