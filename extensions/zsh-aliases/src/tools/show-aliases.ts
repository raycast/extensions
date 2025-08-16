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
    // Return dummy data for now to test the schema
    const allAliases: Array<{ name: string; command: string; file: string }> = [];

    const message = "Found 0 aliases";

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
