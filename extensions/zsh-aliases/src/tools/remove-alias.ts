import { Tool } from "@raycast/api";
import { removeAlias, parseAliases } from "../utils/alias-utils";

/**
 * Input parameters for removing an alias
 */
type Input = {
  /** The name of the alias to remove */
  name: string;
  /** The configuration file containing the alias (.zshrc, .zsh_aliases, or .aliases). If not specified, searches all config files */
  configFile?: string;
};

/**
 * Confirmation function for the remove alias tool
 * Shows a confirmation dialog before removing the alias
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { name, configFile } = input;

  // Find the alias to get details for confirmation
  const aliases = parseAliases();
  const aliasToRemove = aliases.find((alias) => alias.name === name && (!configFile || alias.file === configFile));

  if (!aliasToRemove) {
    return {
      message: `Alias '${name}' not found${configFile ? ` in ${configFile}` : ""}`,
    };
  }

  return {
    message: `Are you sure you want to remove the alias '${name}'?`,
    /**
     * @type {Array<{name: string, value: string}>}
     */
    info: [
      { name: "Alias", value: aliasToRemove.name },
      { name: "Command", value: aliasToRemove.command },
      { name: "File", value: aliasToRemove.file },
    ],
  };
};

/**
 * Remove an existing zsh alias
 *
 * This tool removes an alias from the specified configuration file.
 * If no config file is specified, it searches all config files to find
 * and remove the alias. Requires confirmation before deletion.
 *
 * @param input - The alias name and optional config file
 * @returns Response indicating success or failure with details
 */
export default function removeAliasCommand(input: Input) {
  try {
    const { name, configFile } = input;

    // If config file is specified, try to remove from that file
    if (configFile) {
      const removed = removeAlias(name, configFile);

      if (removed) {
        return {
          success: true,
          message: `Alias '${name}' removed successfully from ${configFile}`,
          aliasName: name,
          configFile,
        };
      } else {
        return {
          success: false,
          message: `Alias '${name}' not found in ${configFile}`,
        };
      }
    }

    // If no config file specified, search all files to find the alias
    const aliases = parseAliases();
    const aliasToRemove = aliases.find((alias) => alias.name === name);

    if (!aliasToRemove) {
      return {
        success: false,
        message: `Alias '${name}' not found`,
      };
    }

    // Remove from the file where it was found
    const removed = removeAlias(name, aliasToRemove.file);

    if (removed) {
      return {
        success: true,
        message: `Alias '${name}' removed successfully from ${aliasToRemove.file}`,
        aliasName: name,
        configFile: aliasToRemove.file,
      };
    } else {
      return {
        success: false,
        message: `Failed to remove alias '${name}' from ${aliasToRemove.file}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to remove alias: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
