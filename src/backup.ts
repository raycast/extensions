import { showHUD, showToast, Toast, Clipboard, getPreferenceValues } from "@raycast/api";
import { writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { getFolders } from "./storage";
import { Folder } from "./types";

/**
 * Preferences that can be exported/imported
 */
export interface ExportedPreferences {
  folderContentsSortPrimary?: string;
  folderContentsSortSecondary?: string;
  folderContentsSortTertiary?: string;
  folderContentsViewType?: string;
  showPreviewPane?: boolean;
  gridSeparateSections?: boolean;
  defaultFolderColor?: string;
}

export interface ExportData {
  version: number;
  exportedAt: string;
  folders: Folder[];
  preferences?: ExportedPreferences;
}

/**
 * Get current preferences for export
 */
function getCurrentPreferences(): ExportedPreferences {
  const prefs = getPreferenceValues<ExportedPreferences>();
  return {
    folderContentsSortPrimary: prefs.folderContentsSortPrimary,
    folderContentsSortSecondary: prefs.folderContentsSortSecondary,
    folderContentsSortTertiary: prefs.folderContentsSortTertiary,
    folderContentsViewType: prefs.folderContentsViewType,
    showPreviewPane: prefs.showPreviewPane,
    gridSeparateSections: prefs.gridSeparateSections,
    defaultFolderColor: prefs.defaultFolderColor,
  };
}

/**
 * Get all nested folders recursively
 * If a folder contains nested folder items, include those folders too
 */
async function getNestedFolders(folder: Folder, allFolders: Folder[]): Promise<Folder[]> {
  const result: Folder[] = [folder];
  const nestedIds = folder.items
    .filter((item) => item.type === "folder" && item.folderId)
    .map((item) => item.folderId!);

  for (const nestedId of nestedIds) {
    const nestedFolder = allFolders.find((f) => f.id === nestedId);
    if (nestedFolder) {
      const deepNested = await getNestedFolders(nestedFolder, allFolders);
      result.push(...deepNested);
    }
  }

  return result;
}

/**
 * Export a single folder (with any nested folders) to Downloads and clipboard
 */
export async function exportFolder(folder: Folder): Promise<void> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Exporting folder...",
    });

    const allFolders = await getFolders();
    const foldersToExport = await getNestedFolders(folder, allFolders);

    const exportData: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      folders: foldersToExport,
      preferences: getCurrentPreferences(),
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    // Save to Downloads folder
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const safeName = folder.name.replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `raycast-folder-${safeName}-${timestamp}.json`;
    const downloadsPath = join(homedir(), "Downloads", filename);

    writeFileSync(downloadsPath, jsonString, "utf-8");

    // Also copy to clipboard for convenience
    await Clipboard.copy(jsonString);

    const nestedCount = foldersToExport.length - 1;
    const message =
      nestedCount > 0
        ? `✅ Exported "${folder.name}" + ${nestedCount} nested folder(s)`
        : `✅ Exported "${folder.name}"`;

    await showHUD(message);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Export failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Export all folders to a JSON file in Downloads and copy to clipboard
 */
export async function exportAllFolders(): Promise<void> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Exporting all folders...",
    });

    const folders = await getFolders();

    if (folders.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No folders to export",
        message: "Create some folders first",
      });
      return;
    }

    const exportData: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      folders,
      preferences: getCurrentPreferences(),
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    // Save to Downloads folder
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `raycast-folders-backup-${timestamp}.json`;
    const downloadsPath = join(homedir(), "Downloads", filename);

    writeFileSync(downloadsPath, jsonString, "utf-8");

    // Also copy to clipboard for convenience
    await Clipboard.copy(jsonString);

    await showHUD(`✅ Exported ${folders.length} folder(s) to Downloads & clipboard`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Export failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Validate import data structure
 * Accepts both single folder and multiple folders
 */
export function validateImportData(data: unknown): data is ExportData {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== "number") return false;
  if (!Array.isArray(obj.folders)) return false;

  // Validate each folder has required fields
  for (const folder of obj.folders) {
    if (!folder || typeof folder !== "object") return false;
    if (typeof folder.id !== "string") return false;
    if (typeof folder.name !== "string") return false;
    if (!Array.isArray(folder.items)) return false;
  }

  return true;
}
