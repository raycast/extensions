/**
 * Zsh configuration file operations
 *
 * Provides functions to read and validate zshrc files with enhanced
 * error handling and security checks.
 */

import { homedir } from "os";
import { readFile, writeFile, stat } from "fs/promises";
import { FILE_CONSTANTS, ERROR_MESSAGES } from "../constants";
import { FileNotFoundError, PermissionError, FileTooLargeError, ReadError, WriteError } from "../utils/errors";
import { validateFilePath, validateFileSize, truncateContent } from "../utils/sanitize";

export const ZSHRC_PATH: string = `${homedir()}/${FILE_CONSTANTS.ZSHRC_FILENAME}`;

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
  try {
    // Validate file path
    if (!(await validateFilePath(ZSHRC_PATH))) {
      throw new Error("Invalid file path");
    }

    // Check file size before reading
    const stats = await stat(ZSHRC_PATH);
    if (!validateFileSize(stats.size)) {
      throw new FileTooLargeError(ZSHRC_PATH, stats.size, FILE_CONSTANTS.MAX_FILE_SIZE);
    }

    const fileContents = await readFile(ZSHRC_PATH, { encoding: "utf8" });

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
        throw new FileNotFoundError(ZSHRC_PATH);
      }

      if (nodeError.code === "EACCES" || nodeError.code === "EPERM") {
        throw new PermissionError(ZSHRC_PATH);
      }

      // Generic read error
      throw new ReadError(ZSHRC_PATH, error);
    }

    // Fallback for unknown errors
    throw new ReadError(ZSHRC_PATH, new Error(ERROR_MESSAGES.READ_ERROR));
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
  try {
    // Validate file path
    if (!(await validateFilePath(ZSHRC_PATH))) {
      throw new Error("Invalid file path");
    }

    // Basic content validation
    if (typeof content !== "string") {
      throw new Error("Content must be a string");
    }

    // Write the file
    await writeFile(ZSHRC_PATH, content, { encoding: "utf8" });
  } catch (error) {
    // Re-throw our custom errors as-is
    if (error instanceof PermissionError || error instanceof WriteError) {
      throw error;
    }

    // Handle Node.js filesystem errors
    if (error instanceof Error) {
      const nodeError = error as Error & { code?: string };

      if (nodeError.code === "EACCES" || nodeError.code === "EPERM") {
        throw new PermissionError(ZSHRC_PATH);
      }

      // Generic write error
      throw new WriteError(ZSHRC_PATH, error);
    }

    // Fallback for unknown errors
    throw new WriteError(ZSHRC_PATH);
  }
}
