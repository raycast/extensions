import { getSelectedFinderItems } from "@raycast/api";
import { existsSync, lstatSync } from "node:fs";
import { dirname } from "node:path";

export async function getFinderTargetPath(): Promise<string | null> {
  try {
    const items = await getSelectedFinderItems();
    if (items.length === 0) return null;
    const selected = items[0].path;
    if (!existsSync(selected)) return null;
    return lstatSync(selected).isDirectory() ? selected : dirname(selected);
  } catch {
    // Finder wasn't frontmost, or no selection
    return null;
  }
}
