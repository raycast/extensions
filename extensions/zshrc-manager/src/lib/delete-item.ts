import { showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { readZshrcFileRaw, writeZshrcFile, getZshrcPath } from "./zsh";
import { clearCache } from "./cache";
import { saveToHistory } from "./history";
import type { EditItemConfig } from "./edit-item-form";
import { replaceFirstScoped } from "./scoped-replace";
import { log } from "../utils/logger";
import { SaveCancelledError } from "../utils/errors";

/**
 * Delete an item from the zshrc file after user confirmation
 *
 * @param key - The key (name/variable) of the item to delete
 * @param config - Configuration for the item type
 * @param skipConfirmation - Skip the confirmation dialog (default: false)
 * @param sectionLabel - Section the item was selected from; scopes deletion so
 *   duplicate definitions in other sections are not touched
 * @returns Promise that resolves when deletion is complete, or rejects if cancelled
 */
export async function deleteItem(
  key: string,
  config: EditItemConfig,
  skipConfirmation = false,
  sectionLabel?: string,
  sectionOccurrence = 0,
): Promise<void> {
  log.delete.info(`Delete requested for ${config.itemType} "${key}"`);

  // Show confirmation dialog unless skipped
  if (!skipConfirmation) {
    log.delete.debug("Showing confirmation dialog");
    const confirmed = await confirmAlert({
      title: `Delete ${config.itemTypeCapitalized}?`,
      message: `Are you sure you want to delete the ${config.itemType} "${key}"? You can undo this action using ⌘Z.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (!confirmed) {
      log.delete.info("Delete cancelled by user");
      return; // User cancelled
    }
  }

  try {
    log.delete.debug("Reading current zshrc content");
    const zshrcContent = await readZshrcFileRaw();
    const pattern = config.generatePattern(key);

    // Scope the removal to the item's section so a duplicate definition in
    // another section is not deleted in its place; refuse rather than guess
    // when the exact definition cannot be resolved
    const {
      content: updatedContent,
      found,
      reason,
    } = replaceFirstScoped(
      zshrcContent,
      sectionLabel,
      pattern,
      () => "",
      (line) => config.matchesDisplayLine(line, key),
      sectionOccurrence,
    );

    if (!found) {
      const message =
        reason === "ambiguous"
          ? `Multiple definitions of "${key}" exist and the selected one could not be identified — edit ~/.zshrc directly`
          : reason === "unsupported"
            ? `The definition of "${key}" uses a format this extension cannot rewrite safely — edit ~/.zshrc directly`
            : `${config.itemTypeCapitalized} "${key}" not found in zshrc`;
      log.delete.error(message);
      throw new Error(message);
    }

    log.delete.debug(`Found ${config.itemType} "${key}", proceeding with deletion`);

    log.delete.debug("Writing updated content");
    await writeZshrcFile(updatedContent);
    clearCache(getZshrcPath());

    log.delete.debug("Verifying write");
    const verify = await readZshrcFileRaw();
    if (verify !== updatedContent) {
      log.delete.error("Write verification failed: content mismatch");
      throw new Error("Write verification failed: content mismatch after delete");
    }

    // Record history only after the write is verified, with the pre-delete
    // snapshot as the undo target — recording earlier risks a restore point
    // for a delete that never happened
    log.delete.debug("Saving pre-delete snapshot to history");
    await saveToHistory(`Delete ${config.itemType} "${key}"`, zshrcContent);

    log.delete.info(`Successfully deleted ${config.itemType} "${key}"`);

    await showToast({
      style: Toast.Style.Success,
      title: `${config.itemTypeCapitalized} Deleted`,
      message: `Deleted ${config.itemType} "${key}"`,
    });
  } catch (error) {
    if (error instanceof SaveCancelledError) {
      throw error;
    }
    log.delete.error(`Failed to delete ${config.itemType} "${key}"`, error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : `Failed to delete ${config.itemType}`,
    });
    throw error;
  }
}
