import { showToast, Toast } from "@raycast/api";
import { readZshrcFileRaw, writeZshrcFile, getZshrcPath } from "./zsh";
import { clearCache } from "./cache";
import type { EditItemConfig } from "./edit-item-form";

/**
 * Delete an item from the zshrc file
 *
 * @param key - The key (name/variable) of the item to delete
 * @param config - Configuration for the item type
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteItem(key: string, config: EditItemConfig): Promise<void> {
  try {
    const zshrcContent = await readZshrcFileRaw();
    const pattern = config.generatePattern(key);
    const match = zshrcContent.match(pattern);

    if (!match || match.length === 0) {
      throw new Error(`${config.itemTypeCapitalized} "${key}" not found in zshrc`);
    }

    // Create a non-global version to replace only first match
    const nonGlobalPattern = new RegExp(pattern.source, pattern.flags.replace("g", ""));

    // Replace only the first match with empty string
    const updatedContent = zshrcContent.replace(nonGlobalPattern, () => {
      // Remove the line entirely
      return "";
    });
    await writeZshrcFile(updatedContent);
    clearCache(getZshrcPath());
    const verify = await readZshrcFileRaw();
    if (verify !== updatedContent) {
      throw new Error("Write verification failed: content mismatch after delete");
    }

    await showToast({
      style: Toast.Style.Success,
      title: `${config.itemTypeCapitalized} Deleted`,
      message: `Deleted ${config.itemType} "${key}"`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : `Failed to delete ${config.itemType}`,
    });
    throw error;
  }
}
