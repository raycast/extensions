/**
 * Content sanitization utilities
 *
 * Provides functions to sanitize and validate content to prevent
 * injection attacks and ensure safe rendering.
 */

import { resolve, normalize } from "node:path";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { FILE_CONSTANTS } from "../constants";

/**
 * Sanitizes markdown content by escaping potentially dangerous characters
 *
 * @param content The markdown content to sanitize
 * @returns Sanitized content with escaped dangerous characters
 */
export function sanitizeMarkdown(content: string): string {
  // Escape backticks to prevent code injection
  return content.replace(/`/g, "\\`").replace(/\$/g, "\\$").replace(/\\/g, "\\\\");
}

/**
 * Escapes shell content for safe display
 *
 * @param content The shell content to escape
 * @returns Escaped content safe for display
 */
export function escapeShellContent(content: string): string {
  return content
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'");
}

/**
 * Validates file path to ensure it's safe to access
 *
 * @param filePath The file path to validate
 * @returns True if the path is safe and points to the expected .zshrc file
 */
export async function validateFilePath(filePath: string): Promise<boolean> {
  try {
    // Basic validation - empty path is invalid
    if (!filePath || filePath.trim() === "") {
      return false;
    }

    // Check for null bytes
    if (filePath.includes("\0")) {
      return false;
    }

    // Check for path traversal attempts
    if (filePath.includes("..") || filePath.includes("../")) {
      return false;
    }

    // Check for tilde expansion attempts
    if (filePath.includes("~")) {
      return false;
    }

    // Normalize and resolve the path
    const normalizedPath = normalize(filePath);
    const resolvedPath = resolve(normalizedPath);

    // Check if the resolved path is outside the home directory
    // This prevents access to system files like /etc/passwd
    const homeDir = process.env["HOME"] || process.env["USERPROFILE"];
    if (homeDir && !resolvedPath.startsWith(homeDir)) {
      return false;
    }

    // Check if the file exists and is accessible
    await access(resolvedPath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates file size against maximum allowed size
 *
 * @param fileSize The file size in bytes to validate
 * @returns True if the file size is within acceptable limits
 */
export function validateFileSize(fileSize: number): boolean {
  return fileSize <= FILE_CONSTANTS.MAX_FILE_SIZE;
}

/**
 * Truncates content to a safe length to prevent memory issues
 *
 * @param content The content to truncate
 * @param maxLength Maximum allowed length (defaults to FILE_CONSTANTS.MAX_CONTENT_LENGTH)
 * @returns Truncated content with ellipsis if truncated
 */
export function truncateContent(content: string, maxLength: number = FILE_CONSTANTS.MAX_CONTENT_LENGTH): string {
  if (content.length <= maxLength) {
    return content;
  }

  return content.slice(0, maxLength) + "\n... (truncated)";
}

/**
 * Validates zshrc content for basic syntax safety
 *
 * @param content The zshrc content to validate
 * @returns Object containing validation result and any errors found
 */
export function validateZshrcContent(content: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for extremely long lines (potential DoS)
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.length > FILE_CONSTANTS.MAX_LINE_LENGTH) {
      errors.push(`Line ${i + 1} is too long (${line.length} characters)`);
    }
  }

  // Check for suspicious patterns
  if (content.includes("eval ") && content.includes("$(curl")) {
    errors.push("Suspicious pattern detected: eval with curl");
  }

  if (content.includes("rm -rf /")) {
    errors.push("Dangerous command detected: rm -rf /");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
