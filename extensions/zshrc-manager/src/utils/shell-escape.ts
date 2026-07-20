/**
 * Shell escaping utilities for safe command generation
 *
 * Provides functions to properly escape shell values and validate
 * shell identifiers to prevent command injection vulnerabilities.
 */

/**
 * Regex pattern for valid alias names.
 * Alias names can contain letters, digits, underscores, and hyphens,
 * but must start with a letter or underscore.
 */
export const VALID_ALIAS_NAME = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

/**
 * Regex pattern for valid variable names (for exports).
 * Variable names can contain letters, digits, and underscores,
 * but must start with a letter or underscore.
 */
export const VALID_VAR_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validates an alias name against shell naming rules.
 *
 * @param name - The alias name to validate
 * @returns True if the name is valid, false otherwise
 */
export function validateAliasName(name: string): boolean {
  if (!name || typeof name !== "string") {
    return false;
  }
  return VALID_ALIAS_NAME.test(name);
}

/**
 * Validates a variable name against shell naming rules.
 *
 * @param name - The variable name to validate
 * @returns True if the name is valid, false otherwise
 */
export function validateVarName(name: string): boolean {
  if (!name || typeof name !== "string") {
    return false;
  }
  return VALID_VAR_NAME.test(name);
}

/**
 * Escapes a string value for safe use in single-quoted shell strings.
 *
 * In shell, single quotes preserve everything literally except you cannot
 * include a single quote inside single quotes. The standard technique is
 * to end the single quote, add an escaped single quote, and restart:
 * 'don'\''t' becomes: don't
 *
 * @param value - The value to escape
 * @returns The escaped value safe for use in single-quoted strings
 */
export function shellQuoteSingle(value: string): string {
  if (typeof value !== "string") {
    return "";
  }
  // Replace each single quote with: end quote, escaped quote, start quote
  // 'foo'bar' -> 'foo'\''bar'
  return value.replace(/'/g, "'\"'\"'");
}

/**
 * Escapes a string value for safe use in double-quoted shell strings.
 *
 * In double quotes, the following characters need escaping:
 * $ (variable expansion), ` (command substitution), \ (escape),
 * " (end quote), ! (history expansion in some shells)
 *
 * @param value - The value to escape
 * @returns The escaped value safe for use in double-quoted strings
 */
export function shellQuoteDouble(value: string): string {
  if (typeof value !== "string") {
    return "";
  }
  // Escape backslashes first, then other special characters
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`")
    .replace(/!/g, "\\!");
}

/**
 * Quotes a value for use in a shell command by wrapping in single quotes
 * and escaping internal single quotes.
 *
 * @param value - The value to quote
 * @returns The fully quoted value including surrounding quotes
 */
export function shellQuote(value: string): string {
  if (typeof value !== "string") {
    return "''";
  }
  return `'${shellQuoteSingle(value)}'`;
}

/**
 * Generates a safe alias definition line.
 *
 * @param name - The alias name (must be validated first)
 * @param command - The command to alias
 * @returns The formatted alias line, or null if name is invalid
 */
export function generateSafeAliasLine(name: string, command: string): string | null {
  if (!validateAliasName(name)) {
    return null;
  }
  return `alias ${name}=${shellQuote(command)}`;
}

/**
 * Generates a safe export definition line.
 *
 * @param variable - The variable name (must be validated first)
 * @param value - The value to export
 * @returns The formatted export line, or null if variable name is invalid
 */
export function generateSafeExportLine(variable: string, value: string): string | null {
  if (!validateVarName(variable)) {
    return null;
  }
  // Use double quotes for exports to safely handle special characters
  return `export ${variable}="${shellQuoteDouble(value)}"`;
}
