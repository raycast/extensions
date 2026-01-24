/**
 * Toggle functionality for zshrc entries
 *
 * Allows enabling/disabling entries by commenting/uncommenting them.
 */

import { showToast, Toast } from "@raycast/api";
import { readZshrcFileRaw, writeZshrcFile, getZshrcPath } from "./zsh";
import { clearCache } from "./cache";
import { saveToHistory } from "./history";
import type { EditItemConfig } from "./edit-item-form";

/** Comment prefix used to disable entries */
const COMMENT_PREFIX = "# ";

/**
 * Checks if a line is commented out
 *
 * @param line The line to check
 * @returns True if the line starts with a comment
 */
export function isCommented(line: string): boolean {
  return line.trimStart().startsWith("#");
}

/**
 * Toggles an item between enabled and disabled state.
 * Disabled items are prefixed with "# " comment.
 *
 * @param key - The key (name/variable) of the item to toggle
 * @param config - Configuration for the item type
 * @returns Promise that resolves to the new state (true = enabled, false = disabled)
 */
export async function toggleItem(key: string, config: EditItemConfig): Promise<boolean> {
  try {
    const zshrcContent = await readZshrcFileRaw();
    const lines = zshrcContent.split("\n");

    // Find the line containing the item
    const pattern = config.generatePattern(key);
    let foundIndex = -1;
    let isCurrentlyCommented = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Check if this line matches (commented or not)
      const uncommentedLine = line.replace(/^(\s*)#\s*/, "$1");
      if (pattern.test(line) || pattern.test(uncommentedLine)) {
        foundIndex = i;
        isCurrentlyCommented = isCommented(line);
        break;
      }
    }

    if (foundIndex === -1) {
      throw new Error(`${config.itemTypeCapitalized} "${key}" not found in zshrc`);
    }

    // Toggle the comment state
    const currentLine = lines[foundIndex]!;
    let newLine: string;

    if (isCurrentlyCommented) {
      // Uncomment: remove the "# " prefix (preserve leading whitespace)
      newLine = currentLine.replace(/^(\s*)#\s*/, "$1");
    } else {
      // Comment: add "# " prefix (preserve leading whitespace)
      const leadingWhitespace = currentLine.match(/^(\s*)/)?.[1] || "";
      const content = currentLine.trimStart();
      newLine = `${leadingWhitespace}${COMMENT_PREFIX}${content}`;
    }

    lines[foundIndex] = newLine;
    const updatedContent = lines.join("\n");

    // Save to history before writing
    const action = isCurrentlyCommented ? "Enable" : "Disable";
    await saveToHistory(`${action} ${config.itemType} "${key}"`);

    await writeZshrcFile(updatedContent);
    clearCache(getZshrcPath());

    // Verify write
    const verify = await readZshrcFileRaw();
    if (verify !== updatedContent) {
      throw new Error("Write verification failed: content mismatch after toggle");
    }

    const newState = !isCurrentlyCommented;
    await showToast({
      style: Toast.Style.Success,
      title: `${config.itemTypeCapitalized} ${newState ? "Enabled" : "Disabled"}`,
      message: `${key} is now ${newState ? "active" : "commented out"}`,
    });

    return newState;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : `Failed to toggle ${config.itemType}`,
    });
    throw error;
  }
}

/**
 * Enables a disabled item by removing the comment prefix
 *
 * @param key - The key (name/variable) of the item to enable
 * @param config - Configuration for the item type
 */
export async function enableItem(key: string, config: EditItemConfig): Promise<void> {
  const zshrcContent = await readZshrcFileRaw();
  const pattern = config.generatePattern(key);

  // Find if the item exists and check its state
  const lines = zshrcContent.split("\n");
  let found = false;
  let isCurrentlyEnabled = false;

  for (const line of lines) {
    if (!line) continue;
    const uncommentedLine = line.replace(/^(\s*)#\s*/, "$1");
    if (pattern.test(line) || pattern.test(uncommentedLine)) {
      found = true;
      isCurrentlyEnabled = !isCommented(line);
      if (!isCurrentlyEnabled) {
        // Item is commented, enable it
        await toggleItem(key, config);
        return;
      }
      break;
    }
  }

  if (!found) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Not Found",
      message: `${config.itemTypeCapitalized} "${key}" not found in zshrc`,
    });
    return;
  }

  // Already enabled
  await showToast({
    style: Toast.Style.Success,
    title: "Already Enabled",
    message: `${config.itemTypeCapitalized} "${key}" is already active`,
  });
}

/**
 * Disables an enabled item by adding the comment prefix
 *
 * @param key - The key (name/variable) of the item to disable
 * @param config - Configuration for the item type
 */
export async function disableItem(key: string, config: EditItemConfig): Promise<void> {
  const zshrcContent = await readZshrcFileRaw();
  const pattern = config.generatePattern(key);

  // Find if the item exists and check its state
  const lines = zshrcContent.split("\n");
  let found = false;
  let isCurrentlyDisabled = false;

  for (const line of lines) {
    if (!line) continue;
    const uncommentedLine = line.replace(/^(\s*)#\s*/, "$1");
    if (pattern.test(line) || pattern.test(uncommentedLine)) {
      found = true;
      isCurrentlyDisabled = isCommented(line);
      if (!isCurrentlyDisabled) {
        // Item is enabled, disable it
        await toggleItem(key, config);
        return;
      }
      break;
    }
  }

  if (!found) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Not Found",
      message: `${config.itemTypeCapitalized} "${key}" not found in zshrc`,
    });
    return;
  }

  // Already disabled
  await showToast({
    style: Toast.Style.Success,
    title: "Already Disabled",
    message: `${config.itemTypeCapitalized} "${key}" is already commented out`,
  });
}
