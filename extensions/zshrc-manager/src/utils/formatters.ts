/**
 * Text formatting utilities for zsh-manager UI components
 *
 * Provides reusable formatting functions for displaying zshrc content
 * in a user-friendly manner.
 */

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
  // Handle words ending in 's' or 'ss' or 'x' or 'z' or 'ch' or 'sh'
  const plural = singular.match(/[sxz]$|[cs]h$/) ? `${singular}es` : `${singular}s`;
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
