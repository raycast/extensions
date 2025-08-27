import { parseAliases } from "../utils/alias-utils";

/**
 * Show all current zsh aliases
 *
 * This tool retrieves and displays all available aliases from
 * the user's zsh configuration files (.zshrc, .zsh_aliases, .aliases).
 *
 * @returns Response containing all aliases and metadata
 */
export default function showAliasesCommand() {
  try {
    const allAliases = parseAliases();

    const message =
      allAliases.length === 0
        ? "Found 0 aliases"
        : allAliases.length === 1
          ? "Found 1 alias"
          : `Found ${allAliases.length} aliases`;

    return {
      success: true,
      aliases: allAliases,
      total: allAliases.length,
      message,
    };
  } catch (error) {
    return {
      success: false,
      aliases: [],
      total: 0,
      message: `Failed to list aliases: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
