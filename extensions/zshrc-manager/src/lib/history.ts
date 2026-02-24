/**
 * History and undo functionality for zshrc changes
 *
 * Uses Raycast's LocalStorage to maintain a history of changes
 * with support for undo operations.
 */

import { LocalStorage, showToast, Toast } from "@raycast/api";
import { readZshrcFileRaw, writeZshrcFile, getZshrcPath } from "./zsh";
import { clearCache } from "./cache";
import { log } from "../utils/logger";

/** Maximum number of history entries to keep */
const MAX_HISTORY_ENTRIES = 10;

/** LocalStorage key for history */
const HISTORY_KEY = "zshrc-manager-history";

/**
 * Represents a single history entry
 */
interface HistoryEntry {
  /** Timestamp of the change */
  timestamp: number;
  /** Description of the change */
  description: string;
  /** Content before the change */
  previousContent: string;
  /** File path (to handle multiple config files) */
  filePath: string;
}

/**
 * Saves the current state to history before making a change
 *
 * @param description Description of the upcoming change
 * @returns Promise resolving to true if history was saved successfully, false otherwise
 */
export async function saveToHistory(description: string): Promise<boolean> {
  log.history.debug(`Saving to history: "${description}"`);
  try {
    const currentContent = await readZshrcFileRaw();
    const filePath = getZshrcPath();

    // Get existing history
    const historyJson = await LocalStorage.getItem<string>(HISTORY_KEY);
    const history: HistoryEntry[] = historyJson ? JSON.parse(historyJson) : [];

    // Add new entry
    history.unshift({
      timestamp: Date.now(),
      description,
      previousContent: currentContent,
      filePath,
    });

    // Trim to max size
    if (history.length > MAX_HISTORY_ENTRIES) {
      history.length = MAX_HISTORY_ENTRIES;
    }

    // Save back to LocalStorage
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    log.history.info(`History saved: "${description}" (${history.length} entries total)`);
    return true;
  } catch (error) {
    log.history.error("Failed to save history entry", error);
    return false;
  }
}

/**
 * Gets the history of changes
 *
 * @returns Promise resolving to array of history entries
 */
export async function getHistory(): Promise<HistoryEntry[]> {
  try {
    const historyJson = await LocalStorage.getItem<string>(HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch {
    return [];
  }
}

/**
 * Undoes the most recent change
 *
 * @returns Promise resolving to true if undo was successful
 */
export async function undoLastChange(): Promise<boolean> {
  log.history.info("Attempting to undo last change");
  try {
    const history = await getHistory();
    log.history.debug(`History contains ${history.length} entries`);

    if (history.length === 0) {
      log.history.warn("Nothing to undo - history is empty");
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to Undo",
        message: "No changes in history",
      });
      return false;
    }

    const lastEntry = history[0];
    if (!lastEntry) {
      log.history.error("History entry is null despite non-empty history");
      return false;
    }

    log.history.debug(`Last entry: "${lastEntry.description}" from ${new Date(lastEntry.timestamp).toISOString()}`);

    // Check if we're undoing for the correct file
    const currentPath = getZshrcPath();
    if (lastEntry.filePath !== currentPath) {
      log.history.warn(`File path mismatch: history=${lastEntry.filePath}, current=${currentPath}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Undo",
        message: "Last change was for a different config file",
      });
      return false;
    }

    // Prepare the new history state first (atomic operation)
    const newHistory = history.slice(1);

    // Persist the new history state BEFORE modifying the file
    // This ensures we don't lose history if the file write fails
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));

    // Restore previous content
    log.history.info(`Restoring content from before: "${lastEntry.description}"`);
    try {
      await writeZshrcFile(lastEntry.previousContent);
      clearCache(currentPath);
    } catch (writeError) {
      // File write failed, restore the original history
      try {
        await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      } catch (rollbackError) {
        log.history.error("Failed to restore history after write failure - history may be inconsistent", rollbackError);
      }
      throw writeError;
    }
    log.history.info(`Undo successful: reverted "${lastEntry.description}"`);

    await showToast({
      style: Toast.Style.Success,
      title: "Undo Successful",
      message: `Reverted: ${lastEntry.description}`,
    });

    return true;
  } catch (error) {
    log.history.error("Undo failed", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Undo Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Clears all history
 *
 * @returns Promise resolving when history is cleared
 */
export async function clearHistory(): Promise<void> {
  log.history.info("Clearing all history");
  await LocalStorage.removeItem(HISTORY_KEY);
}

/**
 * Undoes to a specific point in history
 * Restores the content from the specified entry and removes all entries before it
 *
 * @param index The index of the history entry to restore (0 = most recent)
 * @returns Promise resolving to true if undo was successful
 */
export async function undoToPoint(index: number): Promise<boolean> {
  log.history.info(`Attempting to undo to point ${index}`);
  try {
    const history = await getHistory();

    if (index < 0 || index >= history.length) {
      log.history.warn(`Invalid index ${index} for history of length ${history.length}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Undo Point",
        message: "The selected history entry is no longer available",
      });
      return false;
    }

    const entry = history[index];
    if (!entry) {
      log.history.error("History entry is null");
      return false;
    }

    // Check if we're undoing for the correct file
    const currentPath = getZshrcPath();
    if (entry.filePath !== currentPath) {
      log.history.warn(`File path mismatch: history=${entry.filePath}, current=${currentPath}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Undo",
        message: "This history entry was for a different config file",
      });
      return false;
    }

    // Restore the content from this entry
    log.history.info(`Restoring content from before: "${entry.description}"`);
    await writeZshrcFile(entry.previousContent);
    clearCache(currentPath);

    // Remove all entries up to and including this one
    const newHistory = history.slice(index + 1);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    log.history.info(`Undo successful: reverted ${index + 1} change(s)`);

    const changesReverted = index + 1;
    await showToast({
      style: Toast.Style.Success,
      title: "Undo Successful",
      message: `Reverted ${changesReverted} change${changesReverted > 1 ? "s" : ""}`,
    });

    return true;
  } catch (error) {
    log.history.error("Undo to point failed", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Undo Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Exports the HistoryEntry interface for use in other modules
 */
export type { HistoryEntry };

/**
 * Gets the number of available undo operations
 *
 * @returns Promise resolving to the count of history entries
 */
export async function getUndoCount(): Promise<number> {
  const history = await getHistory();
  return history.length;
}

/**
 * Formats a history entry for display
 *
 * @param entry The history entry to format
 * @returns Formatted string for display
 */
export function formatHistoryEntry(entry: HistoryEntry): string {
  const date = new Date(entry.timestamp);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${timeStr} - ${entry.description}`;
}
