import { appendFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface Alias {
  name: string;
  command: string;
  file: string;
}

/**
 * Escapes special regex characters in a string
 * @param str - The string to escape
 * @returns The escaped string safe for use in RegExp
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Parse aliases from zsh configuration files
 * @returns Array of parsed aliases
 */
export function parseAliases(): Alias[] {
  const homeDir = homedir();
  const configFiles = [".zshrc", ".zsh_aliases", ".aliases"];
  const aliases: Alias[] = [];
  const aliasPattern = /^\s*alias\s+([^=]+)=(['"]?)(.+?)\2\s*$/;

  for (const configFile of configFiles) {
    const filePath = join(homeDir, configFile);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");
        const lines = content.split("\n");

        for (const line of lines) {
          const match = line.match(aliasPattern);
          if (match) {
            aliases.push({
              name: match[1].trim(),
              command: match[3].trim(),
              file: configFile,
            });
          }
        }
      } catch (error) {
        console.error(`Error reading ${configFile}:`, error);
      }
    }
  }

  return aliases.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get available zsh configuration files
 * @returns Array of configuration file paths
 */
export function getConfigFiles(): string[] {
  const homeDir = homedir();
  const configFiles = [".zshrc", ".zsh_aliases", ".aliases"];
  const availableFiles: string[] = [];

  for (const configFile of configFiles) {
    const filePath = join(homeDir, configFile);
    if (existsSync(filePath)) {
      availableFiles.push(configFile);
    }
  }

  // If no config files exist, default to .zshrc
  if (availableFiles.length === 0) {
    availableFiles.push(".zshrc");
  }

  return availableFiles;
}

/**
 * Check if an alias name already exists in any configuration file
 * @param aliasName - Name to check
 * @param excludeFile - Optional file to exclude from check
 * @param excludeName - Optional name to exclude from check (for renaming)
 */
export function aliasExists(aliasName: string, excludeFile?: string, excludeName?: string): boolean {
  const homeDir = homedir();
  const configFiles = [".zshrc", ".zsh_aliases", ".aliases"];

  for (const configFile of configFiles) {
    const filePath = join(homeDir, configFile);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");
        const aliasPattern = new RegExp(`^\\s*alias\\s+${escapeRegExp(aliasName)}=`, "m");
        if (aliasPattern.test(content)) {
          // If we're checking the same file and name (for rename), don't count it as existing
          if (excludeFile === configFile && excludeName === aliasName) {
            continue;
          }
          return true;
        }
      } catch (error) {
        console.error(`Error reading ${configFile}:`, error);
      }
    }
  }
  return false;
}

/**
 * Add an alias to the specified configuration file
 * @param aliasName - Name of the alias
 * @param aliasCommand - Command for the alias
 * @param configFile - Configuration file to add the alias to
 */
export function addAlias(aliasName: string, aliasCommand: string, configFile: string): void {
  const homeDir = homedir();
  const filePath = join(homeDir, configFile);

  // Escape single quotes in the command
  const escapedCommand = aliasCommand.replace(/'/g, "'\\''");
  const aliasLine = `alias ${aliasName}='${escapedCommand}'`;

  try {
    if (existsSync(filePath)) {
      // Read existing content
      const content = readFileSync(filePath, "utf-8");

      // Check if file ends with newline
      const endsWithNewline = content.endsWith("\n");

      // Append alias with proper newlines
      const newContent = endsWithNewline ? `${aliasLine}\n` : `\n${aliasLine}\n`;
      appendFileSync(filePath, newContent);
    } else {
      // Create new file with the alias
      writeFileSync(filePath, `${aliasLine}\n`);
    }
  } catch (error) {
    throw new Error(`Failed to write to ${configFile}: ${error}`);
  }
}

/**
 * Update an alias in its configuration file (supports renaming)
 * @param oldName - Original name of the alias
 * @param newName - New name for the alias
 * @param newCommand - New command for the alias
 * @param configFile - Configuration file containing the alias
 */
export function updateAlias(oldName: string, newName: string, newCommand: string, configFile: string): void {
  const homeDir = homedir();
  const filePath = join(homeDir, configFile);

  if (!existsSync(filePath)) {
    throw new Error(`Configuration file ${configFile} not found`);
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const aliasPattern = new RegExp(`^\\s*alias\\s+${escapeRegExp(oldName)}=(.*)$`);
    let updated = false;

    const newLines = lines.map((line) => {
      const match = line.match(aliasPattern);
      if (match) {
        updated = true;
        // Escape single quotes in the command
        const escapedCommand = newCommand.replace(/'/g, "'\\''");
        return `alias ${newName}='${escapedCommand}'`;
      }
      return line;
    });

    if (!updated) {
      throw new Error(`Alias '${oldName}' not found in ${configFile}`);
    }

    writeFileSync(filePath, newLines.join("\n"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      throw error;
    }
    throw new Error(`Failed to update alias in ${configFile}: ${error}`);
  }
}

/**
 * Remove an alias from its configuration file
 * @param aliasName - Name of the alias to remove
 * @param configFile - Configuration file containing the alias
 * @returns True if removed successfully, false otherwise
 */
export function removeAlias(aliasName: string, configFile: string): boolean {
  const homeDir = homedir();
  const filePath = join(homeDir, configFile);

  if (!existsSync(filePath)) {
    throw new Error(`Configuration file ${configFile} not found`);
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const aliasPattern = new RegExp(`^\\s*alias\\s+${escapeRegExp(aliasName)}=`);
    let removed = false;

    const newLines = lines.filter((line) => {
      if (aliasPattern.test(line)) {
        removed = true;
        return false;
      }
      return true;
    });

    if (removed) {
      writeFileSync(filePath, newLines.join("\n"));
      return true;
    }

    return false;
  } catch (error) {
    throw new Error(`Failed to remove alias from ${configFile}: ${error}`);
  }
}

/**
 * Validate alias name format
 * @param name - Alias name to validate
 * @returns Validation result with error message if invalid
 */
export function validateAliasName(name: string): ValidationResult {
  if (!name || name.trim() === "") {
    return { isValid: false, error: "Alias name is required" };
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return {
      isValid: false,
      error: "Alias name must start with a letter or underscore and contain only letters, numbers, and underscores",
    };
  }
  return { isValid: true };
}

/**
 * Validate alias command format
 * @param command - Alias command to validate
 * @returns Validation result with error message if invalid
 */
export function validateAliasCommand(command: string): ValidationResult {
  if (!command || command.trim() === "") {
    return { isValid: false, error: "Alias command is required" };
  }
  return { isValid: true };
}

/**
 * Search aliases by name or command
 * @param query - Search query
 * @param aliases - Array of aliases to search through
 * @returns Array of matching aliases
 */
export function searchAliases(query: string, aliases?: Alias[]): Alias[] {
  const aliasesToSearch = aliases || parseAliases();
  const lowerQuery = query.toLowerCase();

  return aliasesToSearch.filter(
    (alias) => alias.name.toLowerCase().includes(lowerQuery) || alias.command.toLowerCase().includes(lowerQuery),
  );
}
