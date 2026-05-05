import { addAlias, aliasExists, getConfigFiles, validateAliasCommand, validateAliasName } from "../utils/alias-utils";

/**
 * Input parameters for adding an alias
 */
type Input = {
  /** The name of the alias to create */
  name: string;
  /** The command that the alias should execute */
  command: string;
  /** The configuration file to add the alias to (.zshrc, .zsh_aliases, or .aliases). If not specified, defaults to the first available config file */
  configFile?: string;
};

/**
 * Add a new zsh alias
 *
 * This tool creates a new alias in the specified configuration file.
 * It validates the alias name and command, checks for duplicates,
 * and handles file creation if necessary.
 *
 * @param input - The alias name, command, and optional config file
 * @returns Response indicating success or failure with details
 */
export default function addAliasCommand(input: Input) {
  try {
    const { name, command, configFile } = input;

    // Validate alias name
    const nameValidation = validateAliasName(name);
    if (!nameValidation.isValid) {
      return {
        success: false,
        message: nameValidation.error || "Invalid alias name",
      };
    }

    // Validate alias command
    const commandValidation = validateAliasCommand(command);
    if (!commandValidation.isValid) {
      return {
        success: false,
        message: commandValidation.error || "Invalid alias command",
      };
    }

    // Check if alias already exists
    if (aliasExists(name)) {
      return {
        success: false,
        message: `Alias '${name}' already exists`,
      };
    }

    // Get available config files
    const availableFiles = getConfigFiles();

    // Validate config file if provided
    if (
      configFile &&
      !availableFiles.includes(configFile) &&
      ![".zshrc", ".zsh_aliases", ".aliases"].includes(configFile)
    ) {
      return {
        success: false,
        message: `Invalid config file '${configFile}'. Must be one of: .zshrc, .zsh_aliases, .aliases`,
      };
    }

    // Determine config file to use (after validation)
    const targetFile = configFile || availableFiles[0];

    // Add the alias
    addAlias(name, command, targetFile);

    return {
      success: true,
      message: `Alias '${name}' added successfully to ${targetFile}`,
      aliasName: name,
      configFile: targetFile,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to add alias: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
