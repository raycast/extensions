/**
 * Content sanitization utilities
 *
 * Provides functions to sanitize and validate content to prevent
 * injection attacks and ensure safe rendering.
 */

import { resolve, normalize, dirname } from "node:path";
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
 * Note: This function expects paths to be already expanded (e.g., ~ should be
 * expanded to the home directory before calling this function). Path expansion
 * is handled upstream in getZshrcPath().
 *
 * @param filePath The file path to validate (must be already expanded)
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

    // Check if path starts with ~ or contains ~/ (unexpanded path indicators)
    // This enforces the contract that paths must be expanded before calling this function
    // and prevents security bypass if validateFilePath is called directly with unexpanded paths
    if (filePath.startsWith("~") || filePath.includes("~/")) {
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
 * Validates file path for write operations.
 *
 * Ensures the path is safe, inside the user's home directory, and that either
 * the file itself is writable (if it exists) or the parent directory is
 * writable (to allow first-time file creation).
 */
export async function validateFilePathForWrite(filePath: string): Promise<boolean> {
  try {
    if (!filePath || filePath.trim() === "") {
      return false;
    }

    if (filePath.includes("\0")) {
      return false;
    }

    if (filePath.includes("..") || filePath.includes("../")) {
      return false;
    }

    // Normalize and resolve the path
    const normalizedPath = normalize(filePath);
    const resolvedPath = resolve(normalizedPath);

    const homeDir = process.env["HOME"] || process.env["USERPROFILE"];
    if (homeDir && !resolvedPath.startsWith(homeDir)) {
      return false;
    }

    // If the file exists, check for read and write access
    try {
      await access(resolvedPath, constants.F_OK);
      await access(resolvedPath, constants.R_OK | constants.W_OK);
      return true;
    } catch {
      // If the file doesn't exist, ensure parent directory is writable
      const parentDir = dirname(resolvedPath);
      await access(parentDir, constants.W_OK);
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Validates file size against maximum allowed size
 *
 * @param fileSize The file size in bytes to validate
 * @returns True if the file size is within acceptable limits (non-negative and under max)
 */
export function validateFileSize(fileSize: number): boolean {
  return fileSize >= 0 && fileSize <= FILE_CONSTANTS.MAX_FILE_SIZE;
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
 * Suspicious patterns to detect in zshrc content.
 * These are heuristics and can be bypassed - they serve as a warning mechanism,
 * not a security boundary. The user's zshrc is already trusted code.
 */
const SUSPICIOUS_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  // Detect eval with remote code execution patterns (curl, wget, etc.)
  {
    pattern: /eval\s+.*\$\(\s*(?:curl|wget|fetch)/i,
    message: "Suspicious pattern: eval with remote code download",
  },
  // Detect dangerous recursive delete on root
  {
    pattern: /rm\s+(?:-[a-z]*r[a-z]*\s+)?(?:-[a-z]*f[a-z]*\s+)?\/(?:\s|$|;)/,
    message: "Dangerous command: recursive delete on root filesystem",
  },
  // Detect chmod 777 on sensitive paths
  {
    pattern: /chmod\s+777\s+(?:\/|~)/,
    message: "Suspicious pattern: overly permissive chmod on home or root",
  },
];

/**
 * Validates zshrc content for basic safety checks.
 *
 * Note: This is NOT a security boundary. The user's zshrc is already trusted code
 * that runs in their shell. These checks serve as helpful warnings for potentially
 * dangerous patterns that might indicate copy-paste errors or malicious code
 * injected from untrusted sources.
 *
 * @param content The zshrc content to validate
 * @returns Object containing validation result and any warnings found
 */
export function validateZshrcContent(content: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for extremely long lines (potential DoS or binary content)
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.length > FILE_CONSTANTS.MAX_LINE_LENGTH) {
      errors.push(`Line ${i + 1} is too long (${line.length} characters)`);
    }
  }

  // Check for suspicious patterns using regex for more robust detection
  for (const { pattern, message } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      errors.push(message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
