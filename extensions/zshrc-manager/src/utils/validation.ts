/**
 * Validation utilities for zshrc content
 *
 * Provides functions to detect duplicates and broken source paths.
 */

import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";

/**
 * Result of duplicate detection
 */
export interface DuplicateResult {
  /** Items that appear multiple times */
  duplicates: Array<{
    name: string;
    count: number;
    sections: string[];
  }>;
  /** Total number of duplicates found */
  totalDuplicates: number;
}

/**
 * Result of broken source detection
 */
export interface BrokenSourceResult {
  /** Source paths that don't exist */
  brokenSources: Array<{
    path: string;
    section: string;
    expandedPath: string;
  }>;
  /** Total number of broken sources found */
  totalBroken: number;
}

/**
 * Detects duplicate aliases or exports in the zshrc content
 *
 * @param items Array of items with name/variable and section properties
 * @param keyField The field to check for duplicates ('name' for aliases, 'variable' for exports)
 * @returns DuplicateResult with information about duplicates found
 */
export function detectDuplicates<T extends { section?: string }>(items: T[], keyField: keyof T): DuplicateResult {
  const countMap = new Map<string, { count: number; sections: Set<string> }>();

  for (const item of items) {
    const key = String(item[keyField]);
    const section = item.section || "Unknown";

    if (!countMap.has(key)) {
      countMap.set(key, { count: 0, sections: new Set() });
    }
    const entry = countMap.get(key)!;
    entry.count++;
    entry.sections.add(section);
  }

  const duplicates = Array.from(countMap.entries())
    .filter(([, value]) => value.count > 1)
    .map(([name, value]) => ({
      name,
      count: value.count,
      sections: Array.from(value.sections),
    }));

  return {
    duplicates,
    totalDuplicates: duplicates.reduce((sum, d) => sum + d.count - 1, 0),
  };
}

/**
 * Expands environment variables and ~ in a path
 *
 * @param sourcePath The path to expand
 * @returns The expanded path
 */
function expandPath(sourcePath: string): string {
  let expanded = sourcePath;

  // Expand ~
  if (expanded.startsWith("~")) {
    expanded = expanded.replace(/^~/, homedir());
  }

  // Expand common environment variables
  expanded = expanded.replace(/\$HOME\b/g, homedir());
  expanded = expanded.replace(/\$\{HOME\}/g, homedir());

  // Expand $ZSH if it's a common Oh-My-Zsh path
  if (expanded.includes("$ZSH") || expanded.includes("${ZSH}")) {
    const zshPath = `${homedir()}/.oh-my-zsh`;
    expanded = expanded.replace(/\$ZSH\b/g, zshPath);
    expanded = expanded.replace(/\$\{ZSH\}/g, zshPath);
  }

  return expanded;
}

/**
 * Checks if a source path exists and is accessible
 *
 * @param sources Array of source entries with path and section properties
 * @returns Promise resolving to BrokenSourceResult
 */
export async function detectBrokenSources(
  sources: Array<{ path: string; section?: string }>,
): Promise<BrokenSourceResult> {
  const brokenSources: BrokenSourceResult["brokenSources"] = [];

  for (const source of sources) {
    const expandedPath = expandPath(source.path);

    // Skip paths with unresolved variables (contain $ after expansion)
    if (expandedPath.includes("$")) {
      continue;
    }

    try {
      await access(expandedPath, constants.R_OK);
    } catch {
      brokenSources.push({
        path: source.path,
        section: source.section || "Unknown",
        expandedPath,
      });
    }
  }

  return {
    brokenSources,
    totalBroken: brokenSources.length,
  };
}

/**
 * Result of structural validation
 */
export interface StructuralValidationResult {
  /** Whether the content is valid */
  isValid: boolean;
  /** List of warnings (non-blocking issues) */
  warnings: string[];
  /** List of errors (blocking issues) */
  errors: string[];
}

/**
 * Validates the structural integrity of a value
 * Checks for common issues like unbalanced quotes, special characters, etc.
 *
 * @param value The value to validate
 * @returns StructuralValidationResult with any issues found
 */
export function validateStructure(value: string): StructuralValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for unbalanced quotes
  const singleQuotes = (value.match(/'/g) || []).length;
  const doubleQuotes = (value.match(/"/g) || []).length;
  const backticks = (value.match(/`/g) || []).length;

  if (singleQuotes % 2 !== 0) {
    warnings.push("Unbalanced single quotes detected");
  }
  if (doubleQuotes % 2 !== 0) {
    warnings.push("Unbalanced double quotes detected");
  }
  if (backticks % 2 !== 0) {
    warnings.push("Unbalanced backticks detected");
  }

  // Check for unbalanced parentheses
  const openParens = (value.match(/\(/g) || []).length;
  const closeParens = (value.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    warnings.push("Unbalanced parentheses detected");
  }

  // Check for unbalanced brackets
  const openBrackets = (value.match(/\[/g) || []).length;
  const closeBrackets = (value.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    warnings.push("Unbalanced brackets detected");
  }

  // Check for unbalanced braces
  const openBraces = (value.match(/\{/g) || []).length;
  const closeBraces = (value.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    warnings.push("Unbalanced braces detected");
  }

  // Check for potential issues with special characters
  if (value.includes("\\n") && !value.includes("$'")) {
    warnings.push("Contains \\n - use $'...' syntax for literal newlines");
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Validates an alias command
 *
 * @param command The alias command to validate
 * @returns StructuralValidationResult
 */
export function validateAliasCommand(command: string): StructuralValidationResult {
  const result = validateStructure(command);

  // Additional alias-specific checks
  if (command.startsWith("alias ")) {
    result.warnings.push("Command should not start with 'alias' - just provide the command");
  }

  // Check for common dangerous patterns
  if (/rm\s+-rf?\s+[/~]/.test(command)) {
    result.warnings.push("Potentially dangerous rm command with root or home path");
  }

  return result;
}

/**
 * Validates an export value
 *
 * @param value The export value to validate
 * @returns StructuralValidationResult
 */
export function validateExportValue(value: string): StructuralValidationResult {
  const result = validateStructure(value);

  // Check for common PATH issues - count $PATH occurrences
  const pathOccurrences = (value.match(/\$PATH/g) || []).length;
  if (pathOccurrences > 1) {
    result.warnings.push("$PATH appears multiple times in value - possible duplication");
  }

  return result;
}
