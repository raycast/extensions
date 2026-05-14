/**
 * Text formatting utilities for zsh-manager UI components
 *
 * Provides reusable formatting functions for displaying zshrc content
 * in a user-friendly manner.
 */

import { homedir } from "node:os";

/**
 * Truncates a value from the middle if it exceeds the specified limit
 *
 * Example: "very-long-path-that-is-too-long" with limit 20 becomes
 * "very-long-...too-long"
 *
 * @param value The string value to truncate
 * @param limit Maximum length for the displayed value (default: 40)
 * @returns Truncated value with ellipsis in the middle, or original if under limit
 */
export function truncateValueMiddle(value: string, limit: number = 40): string {
  const v = value.trim();
  if (v.length <= limit) return v;
  const head = Math.max(0, Math.floor(limit / 2) - 1);
  const tail = Math.max(0, limit - head - 1);
  return `${v.slice(0, head)}…${v.slice(v.length - tail)}`;
}

/**
 * Formats a count with a singular/plural suffix
 *
 * Example: formatCount(1, "alias") returns "1 alias"
 *          formatCount(5, "alias") returns "5 aliases"
 *
 * @param count The numeric count
 * @param singular The singular form of the word
 * @returns Formatted count with appropriate plural form
 */
export function formatCount(count: number, singular: string): string {
  if (count === 1) {
    return `${count} ${singular}`;
  }
  // Handle words ending in 's', 'x', 'z', 'ch', 'sh' - add 'es'
  // Note: only specific words need z-doubling (quiz -> quizzes, fez -> fezzes)
  // Most z-ending words just add 'es' (waltz -> waltzes)
  const zDoublingWords = new Set(["quiz", "fez", "fizz", "buzz", "fuzz", "jazz", "razz"]);
  let plural: string;
  if (singular.match(/[sxz]$|[cs]h$/)) {
    if (zDoublingWords.has(singular.toLowerCase())) {
      plural = `${singular}zes`;
    } else {
      plural = `${singular}es`;
    }
  } else {
    plural = `${singular}s`;
  }
  return `${count} ${plural}`;
}

/**
 * Formats a line range display
 *
 * Example: formatLineRange(1, 10) returns "Lines 1-10"
 *
 * @param startLine The starting line number
 * @param endLine The ending line number (inclusive)
 * @returns Formatted line range string
 */
export function formatLineRange(startLine: number, endLine: number): string {
  return `Lines ${startLine}-${endLine}`;
}

/**
 * Sanitizes a value for display in markdown
 *
 * Escapes special markdown characters to prevent rendering issues
 *
 * @param value The value to sanitize
 * @returns Sanitized value safe for markdown display
 */
export function sanitizeForMarkdown(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

/**
 * Expands common environment variables in a string for display purposes.
 * This helps users understand what paths actually resolve to.
 *
 * Supported variables:
 * - $HOME, ${HOME} -> user's home directory
 * - $USER, ${USER} -> current username
 * - ~ -> home directory (when at start of path)
 * - $ZSH, ${ZSH} -> ~/.oh-my-zsh (common convention)
 *
 * @param value The string containing environment variables
 * @returns String with environment variables expanded
 */
export function expandEnvVars(value: string): string {
  let expanded = value;
  const home = homedir();
  const user = process.env["USER"] || process.env["USERNAME"] || "user";

  // Expand ~ at the start of paths
  if (expanded.startsWith("~")) {
    expanded = expanded.replace(/^~/, home);
  }

  // Expand $HOME and ${HOME}
  expanded = expanded.replace(/\$HOME\b/g, home);
  expanded = expanded.replace(/\$\{HOME\}/g, home);

  // Expand $USER and ${USER}
  expanded = expanded.replace(/\$USER\b/g, user);
  expanded = expanded.replace(/\$\{USER\}/g, user);

  // Expand $ZSH - first check process.env, then fall back to common Oh-My-Zsh convention
  const zshPath = process.env["ZSH"] || `${home}/.oh-my-zsh`;
  expanded = expanded.replace(/\$ZSH\b/g, zshPath);
  expanded = expanded.replace(/\$\{ZSH\}/g, zshPath);

  // Expand $ZDOTDIR (zsh config directory)
  const zdotdir = process.env["ZDOTDIR"] || home;
  expanded = expanded.replace(/\$ZDOTDIR\b/g, zdotdir);
  expanded = expanded.replace(/\$\{ZDOTDIR\}/g, zdotdir);

  return expanded;
}

/**
 * Formats a path for display, optionally expanding environment variables.
 * Can also contract the home directory back to ~ for cleaner display.
 *
 * @param path The path to format
 * @param options Formatting options
 * @returns Formatted path string
 */
export function formatPath(path: string, options: { expand?: boolean; contractHome?: boolean } = {}): string {
  const { expand = false, contractHome = true } = options;
  let formatted = path;

  if (expand) {
    formatted = expandEnvVars(formatted);
  }

  if (contractHome) {
    const home = homedir();
    if (formatted.startsWith(home)) {
      formatted = formatted.replace(home, "~");
    }
  }

  return formatted;
}
