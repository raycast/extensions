/**
 * Import/Export functionality for zshrc entries
 *
 * Allows exporting aliases and exports to JSON format
 * and importing them back into the zshrc file.
 */

import { Clipboard, showToast, Toast } from "@raycast/api";
import { readZshrcFileRaw, writeZshrcFile, getZshrcPath } from "./zsh";
import { clearCache } from "./cache";
import { saveToHistory } from "./history";
import { validateAliasName, validateVarName, shellQuoteSingle, shellQuoteDouble } from "../utils/shell-escape";

/**
 * Exported alias format
 */
interface ExportedAlias {
  name: string;
  command: string;
}

/**
 * Exported environment variable format
 */
interface ExportedExport {
  variable: string;
  value: string;
}

/**
 * Full export format
 */
interface ZshrcExport {
  version: 1;
  exportedAt: string;
  aliases?: ExportedAlias[];
  exports?: ExportedExport[];
}

/**
 * Exports aliases to JSON format and copies to clipboard
 *
 * @param aliases Array of alias entries to export
 * @returns Promise resolving to the JSON string
 */
export async function exportAliasesToJson(aliases: Array<{ name: string; command: string }>): Promise<string> {
  const exportData: ZshrcExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    aliases: aliases.map((a) => ({ name: a.name, command: a.command })),
  };

  const json = JSON.stringify(exportData, null, 2);

  await Clipboard.copy(json);
  await showToast({
    style: Toast.Style.Success,
    title: "Aliases Exported",
    message: `${aliases.length} aliases copied to clipboard`,
  });

  return json;
}

/**
 * Exports environment variables to JSON format and copies to clipboard
 *
 * @param exports Array of export entries to export
 * @returns Promise resolving to the JSON string
 */
export async function exportExportsToJson(exports: Array<{ variable: string; value: string }>): Promise<string> {
  const exportData: ZshrcExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exports: exports.map((e) => ({ variable: e.variable, value: e.value })),
  };

  const json = JSON.stringify(exportData, null, 2);

  await Clipboard.copy(json);
  await showToast({
    style: Toast.Style.Success,
    title: "Exports Exported",
    message: `${exports.length} exports copied to clipboard`,
  });

  return json;
}

/**
 * Imports aliases from JSON string and adds them to zshrc
 *
 * @param json JSON string containing aliases to import
 * @param sectionLabel Optional section label to add aliases under
 * @returns Promise resolving to the number of aliases imported
 */
export async function importAliasesFromJson(json: string, sectionLabel?: string): Promise<number> {
  try {
    const data: ZshrcExport = JSON.parse(json);

    if (data.version !== 1) {
      throw new Error("Unsupported export format version");
    }

    if (!data.aliases || data.aliases.length === 0) {
      throw new Error("No aliases found in import data");
    }

    // Validate alias names before proceeding
    const invalidAliases = data.aliases.filter((a) => !validateAliasName(a.name));
    if (invalidAliases.length > 0) {
      throw new Error(
        `Invalid alias name(s): ${invalidAliases.map((a) => a.name).join(", ")}. Names must start with a letter or underscore and contain only letters, digits, underscores, and hyphens.`,
      );
    }

    // Save history before modifying
    await saveToHistory(`Import ${data.aliases.length} aliases`);

    const zshrcContent = await readZshrcFileRaw();

    // Generate alias lines with proper escaping
    const aliasLines = data.aliases.map((a) => `alias ${a.name}='${shellQuoteSingle(a.command)}'`);

    // Add section header if specified
    let insertContent = "";
    if (sectionLabel) {
      insertContent = `\n# --- ${sectionLabel} ---\n${aliasLines.join("\n")}\n`;
    } else {
      insertContent = `\n${aliasLines.join("\n")}\n`;
    }

    // Append to end of file
    const updatedContent = zshrcContent.trimEnd() + insertContent;

    await writeZshrcFile(updatedContent);
    clearCache(getZshrcPath());

    await showToast({
      style: Toast.Style.Success,
      title: "Aliases Imported",
      message: `${data.aliases.length} aliases added to zshrc`,
    });

    return data.aliases.length;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Import Failed",
      message: error instanceof Error ? error.message : "Invalid JSON format",
    });
    throw error;
  }
}

/**
 * Imports exports from JSON string and adds them to zshrc
 *
 * @param json JSON string containing exports to import
 * @param sectionLabel Optional section label to add exports under
 * @returns Promise resolving to the number of exports imported
 */
export async function importExportsFromJson(json: string, sectionLabel?: string): Promise<number> {
  try {
    const data: ZshrcExport = JSON.parse(json);

    if (data.version !== 1) {
      throw new Error("Unsupported export format version");
    }

    if (!data.exports || data.exports.length === 0) {
      throw new Error("No exports found in import data");
    }

    // Validate variable names before proceeding
    const invalidExports = data.exports.filter((e) => !validateVarName(e.variable));
    if (invalidExports.length > 0) {
      throw new Error(
        `Invalid variable name(s): ${invalidExports.map((e) => e.variable).join(", ")}. Names must start with a letter or underscore and contain only letters, digits, and underscores.`,
      );
    }

    // Save history before modifying
    await saveToHistory(`Import ${data.exports.length} exports`);

    const zshrcContent = await readZshrcFileRaw();

    // Generate export lines with proper escaping
    const exportLines = data.exports.map((e) => `export ${e.variable}="${shellQuoteDouble(e.value)}"`);

    // Add section header if specified
    let insertContent = "";
    if (sectionLabel) {
      insertContent = `\n# --- ${sectionLabel} ---\n${exportLines.join("\n")}\n`;
    } else {
      insertContent = `\n${exportLines.join("\n")}\n`;
    }

    // Append to end of file
    const updatedContent = zshrcContent.trimEnd() + insertContent;

    await writeZshrcFile(updatedContent);
    clearCache(getZshrcPath());

    await showToast({
      style: Toast.Style.Success,
      title: "Exports Imported",
      message: `${data.exports.length} exports added to zshrc`,
    });

    return data.exports.length;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Import Failed",
      message: error instanceof Error ? error.message : "Invalid JSON format",
    });
    throw error;
  }
}

/**
 * Validates import JSON without actually importing
 *
 * @param json JSON string to validate
 * @returns Object with validation result
 */
export function validateImportJson(json: string): {
  valid: boolean;
  aliasCount: number;
  exportCount: number;
  error?: string;
} {
  try {
    const data: ZshrcExport = JSON.parse(json);

    if (data.version !== 1) {
      return { valid: false, aliasCount: 0, exportCount: 0, error: "Unsupported version" };
    }

    return {
      valid: true,
      aliasCount: data.aliases?.length || 0,
      exportCount: data.exports?.length || 0,
    };
  } catch (error) {
    return {
      valid: false,
      aliasCount: 0,
      exportCount: 0,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}
