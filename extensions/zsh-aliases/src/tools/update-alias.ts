import { Tool } from "@raycast/api";
import { aliasExists, parseAliases, updateAlias, validateAliasCommand, validateAliasName } from "../utils/alias-utils";

/**
 * Input parameters for updating an alias
 */
type Input = {
  /** The current name of the alias to update */
  currentName: string;
  /** The new name for the alias (can be the same as currentName) */
  newName: string;
  /** The new command for the alias */
  newCommand: string;
  /** The configuration file containing the alias (.zshrc, .zsh_aliases, or .aliases). If not specified, searches all config files */
  configFile?: string;
};

/**
 * Confirmation function for the update alias tool
 * Shows a confirmation dialog before updating the alias
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { currentName, newName, newCommand, configFile } = input;

  // Find the current alias to get details for confirmation
  const aliases = parseAliases();
  const currentAlias = aliases.find(
    (alias) => alias.name === currentName && (!configFile || alias.file === configFile),
  );

  if (!currentAlias) {
    return {
      message: `Alias '${currentName}' not found${configFile ? ` in ${configFile}` : ""}`,
    };
  }

  const isRename = currentName !== newName;
  const message = isRename
    ? `Are you sure you want to rename '${currentName}' to '${newName}' and update its command?`
    : `Are you sure you want to update the command for '${currentName}'?`;

  return {
    message,
    /**
     * @type {Array<{name: string, value: string}>}
     */
    info: [
      { name: "Current Name", value: currentAlias.name },
      { name: "New Name", value: newName },
      { name: "Current Command", value: currentAlias.command },
      { name: "New Command", value: newCommand },
      { name: "File", value: currentAlias.file },
    ],
  };
};

/**
 * Update an existing zsh alias
 *
 * This tool updates an alias name and/or command in the specified configuration file.
 * If no config file is specified, it searches all config files to find the alias.
 * Supports both renaming and command updates. Requires confirmation before changes.
 *
 * @param input - The current name, new name, new command, and optional config file
 * @returns Response indicating success or failure with details
 */
export default function updateAliasCommand(input: Input) {
  try {
    const { currentName, newName, newCommand, configFile } = input;

    // Validate new alias name
    const nameValidation = validateAliasName(newName);
    if (!nameValidation.isValid) {
      return {
        success: false,
        message: nameValidation.error || "Invalid alias name",
      };
    }

    // Validate new alias command
    const commandValidation = validateAliasCommand(newCommand);
    if (!commandValidation.isValid) {
      return {
        success: false,
        message: commandValidation.error || "Invalid alias command",
      };
    }

    // If config file is specified, try to update in that file
    if (configFile) {
      // Check if we're renaming and the new name already exists
      if (currentName !== newName && aliasExists(newName, configFile, currentName)) {
        return {
          success: false,
          message: `Alias '${newName}' already exists`,
        };
      }

      updateAlias(currentName, newName, newCommand, configFile);

      return {
        success: true,
        message:
          currentName !== newName
            ? `Alias '${currentName}' renamed to '${newName}' and updated in ${configFile}`
            : `Alias '${currentName}' updated successfully in ${configFile}`,
        oldName: currentName,
        newName,
        configFile,
      };
    }

    // If no config file specified, search all files to find the alias
    const aliases = parseAliases();
    const aliasToUpdate = aliases.find((alias) => alias.name === currentName);

    if (!aliasToUpdate) {
      return {
        success: false,
        message: `Alias '${currentName}' not found`,
      };
    }

    // Check if we're renaming and the new name already exists
    if (currentName !== newName && aliasExists(newName, aliasToUpdate.file, currentName)) {
      return {
        success: false,
        message: `Alias '${newName}' already exists`,
      };
    }

    // Update in the file where it was found
    updateAlias(currentName, newName, newCommand, aliasToUpdate.file);

    return {
      success: true,
      message:
        currentName !== newName
          ? `Alias '${currentName}' renamed to '${newName}' and updated in ${aliasToUpdate.file}`
          : `Alias '${currentName}' updated successfully in ${aliasToUpdate.file}`,
      oldName: currentName,
      newName,
      configFile: aliasToUpdate.file,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update alias: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
