import { showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { readZshrcFileRaw, writeZshrcFile, getZshrcPath } from "./zsh";
import { clearCache } from "./cache";
import { saveToHistory } from "./history";
import type { EditItemConfig } from "./edit-item-form";
import { log } from "../utils/logger";

/**
 * Delete an item from the zshrc file after user confirmation
 *
 * @param key - The key (name/variable) of the item to delete
 * @param config - Configuration for the item type
 * @param skipConfirmation - Skip the confirmation dialog (default: false)
 * @returns Promise that resolves when deletion is complete, or rejects if cancelled
 */
export async function deleteItem(key: string, config: EditItemConfig, skipConfirmation = false): Promise<void> {
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
    const match = zshrcContent.match(pattern);

    if (!match || match.length === 0) {
      log.delete.error(`${config.itemType} "${key}" not found in zshrc`);
      throw new Error(`${config.itemTypeCapitalized} "${key}" not found in zshrc`);
    }

    log.delete.debug(`Found ${config.itemType} "${key}", proceeding with deletion`);

    // Create a non-global version to replace only first match
    const nonGlobalPattern = new RegExp(pattern.source, pattern.flags.replace("g", ""));

    // Replace only the first match with empty string
    const updatedContent = zshrcContent.replace(nonGlobalPattern, () => {
      // Remove the line entirely
      return "";
    });

    // Save to history before writing
    log.delete.debug("Saving to history before delete");
    await saveToHistory(`Delete ${config.itemType} "${key}"`);

    log.delete.debug("Writing updated content");
    await writeZshrcFile(updatedContent);
    clearCache(getZshrcPath());

    log.delete.debug("Verifying write");
    const verify = await readZshrcFileRaw();
    if (verify !== updatedContent) {
      log.delete.error("Write verification failed: content mismatch");
      throw new Error("Write verification failed: content mismatch after delete");
    }

    log.delete.info(`Successfully deleted ${config.itemType} "${key}"`);

    await showToast({
      style: Toast.Style.Success,
      title: `${config.itemTypeCapitalized} Deleted`,
      message: `Deleted ${config.itemType} "${key}"`,
    });
  } catch (error) {
    log.delete.error(`Failed to delete ${config.itemType} "${key}"`, error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : `Failed to delete ${config.itemType}`,
    });
    throw error;
  }
}
