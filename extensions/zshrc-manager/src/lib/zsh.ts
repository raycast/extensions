/**
 * Zsh configuration file operations
 *
 * Provides functions to read and validate zshrc files with enhanced
 * error handling and security checks.
 */

import { homedir } from "os";
import { readFile, writeFile, stat } from "fs/promises";
import { getPreferenceValues } from "@raycast/api";
import { FILE_CONSTANTS, ERROR_MESSAGES } from "../constants";
import { FileNotFoundError, PermissionError, FileTooLargeError, ReadError, WriteError } from "../utils/errors";
import { validateFilePath, validateFileSize, truncateContent } from "../utils/sanitize";

/**
 * Gets the zshrc file path from preferences or default location
 *
 * @returns The zshrc file path
 */
export function getZshrcPath(): string {
  const prefs = getPreferenceValues<Preferences>();

  if (prefs["enableCustomZshrcPath"] && prefs["customZshrcPath"]) {
    let customPath = prefs["customZshrcPath"];

    // Expand ~ to home directory
    if (customPath.startsWith("~")) {
      customPath = customPath.replace("~", homedir());
    }

    return customPath;
  }

  return `${homedir()}/${FILE_CONSTANTS.ZSHRC_FILENAME}`;
}

/**
 * Reads the zshrc file with enhanced error handling and validation
 *
 * @returns Promise resolving to the file content
 * @throws {FileNotFoundError} When the file doesn't exist
 * @throws {PermissionError} When file access is denied
 * @throws {FileTooLargeError} When the file exceeds maximum size
 * @throws {ReadError} When file reading fails for other reasons
 */
export async function readZshrcFile(): Promise<string> {
  const zshrcPath = getZshrcPath();

  try {
    // Validate file path
    if (!(await validateFilePath(zshrcPath))) {
      throw new Error("Invalid file path");
    }

    // Check file size before reading
    const stats = await stat(zshrcPath);
    if (!validateFileSize(stats.size)) {
      throw new FileTooLargeError(zshrcPath, stats.size, FILE_CONSTANTS.MAX_FILE_SIZE);
    }

    const fileContents = await readFile(zshrcPath, { encoding: "utf8" });

    // Truncate content if it's still too large after reading
    const safeContent = truncateContent(fileContents);

    return safeContent;
  } catch (error) {
    // Re-throw our custom errors as-is
    if (
      error instanceof FileNotFoundError ||
      error instanceof PermissionError ||
      error instanceof FileTooLargeError ||
      error instanceof ReadError
    ) {
      throw error;
    }

    // Handle Node.js filesystem errors
    if (error instanceof Error) {
      const nodeError = error as Error & { code?: string };

      if (nodeError.code === "ENOENT") {
        throw new FileNotFoundError(zshrcPath);
      }

      if (nodeError.code === "EACCES" || nodeError.code === "EPERM") {
        throw new PermissionError(zshrcPath);
      }

      // Generic read error
      throw new ReadError(zshrcPath, error);
    }

    // Fallback for unknown errors
    throw new ReadError(zshrcPath, new Error(ERROR_MESSAGES.READ_ERROR));
  }
}

/**
 * Writes content to the zshrc file with enhanced error handling and validation
 *
 * @param content The content to write to the file
 * @returns Promise resolving when the write operation completes
 * @throws {PermissionError} When file write access is denied
 * @throws {WriteError} When file writing fails for other reasons
 */
export async function writeZshrcFile(content: string): Promise<void> {
  const zshrcPath = getZshrcPath();

  try {
    // Validate file path
    if (!(await validateFilePath(zshrcPath))) {
      throw new Error("Invalid file path");
    }

    // Basic content validation
    if (typeof content !== "string") {
      throw new Error("Content must be a string");
    }

    // Write the file
    await writeFile(zshrcPath, content, { encoding: "utf8" });
  } catch (error) {
    // Re-throw our custom errors as-is
    if (error instanceof PermissionError || error instanceof WriteError) {
      throw error;
    }

    // Handle Node.js filesystem errors
    if (error instanceof Error) {
      const nodeError = error as Error & { code?: string };

      if (nodeError.code === "EACCES" || nodeError.code === "EPERM") {
        throw new PermissionError(zshrcPath);
      }

      // Generic write error
      throw new WriteError(zshrcPath, error);
    }

    // Fallback for unknown errors
    throw new WriteError(zshrcPath);
  }
}
