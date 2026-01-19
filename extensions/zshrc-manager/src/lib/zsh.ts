/**
 * Zsh configuration file operations
 *
 * Provides functions to read and validate zshrc files with enhanced
 * error handling and security checks.
 */

import { homedir } from "os";
import { readFile, writeFile, stat, rename, lstat, realpath } from "fs/promises";
import { dirname } from "node:path";
import { getPreferenceValues } from "@raycast/api";
import { FILE_CONSTANTS, ERROR_MESSAGES } from "../constants";
import { FileNotFoundError, PermissionError, FileTooLargeError, ReadError, WriteError } from "../utils/errors";
import { validateFilePath, validateFileSize, truncateContent, validateFilePathForWrite } from "../utils/sanitize";
import { access } from "node:fs/promises";
import { constants } from "node:fs";

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
 * Diagnose access to the current zshrc path.
 */
export async function checkZshrcAccess(): Promise<{
  path: string;
  exists: boolean;
  readable: boolean;
  writable: boolean;
}> {
  const zshrcPath = getZshrcPath();
  let exists = false;
  let readable = false;
  let writable = false;

  try {
    await access(zshrcPath, constants.F_OK);
    exists = true;
  } catch {
    exists = false;
  }

  if (exists) {
    try {
      await access(zshrcPath, constants.R_OK);
      readable = true;
    } catch {
      readable = false;
    }
    try {
      await access(zshrcPath, constants.W_OK);
      writable = true;
    } catch {
      writable = false;
    }
  } else {
    // If file doesn't exist, check if parent dir is writable for creation
    try {
      const dir = dirname(zshrcPath);
      await access(dir, constants.W_OK);
      writable = true;
      readable = true; // Once created, it will be readable by owner
    } catch {
      writable = false;
      readable = false;
    }
  }

  return { path: zshrcPath, exists, readable, writable };
}

/**
 * Reads the zshrc file without truncation (for edit/write flows)
 */
export async function readZshrcFileRaw(): Promise<string> {
  const zshrcPath = getZshrcPath();

  try {
    if (!(await validateFilePath(zshrcPath))) {
      throw new Error("Invalid file path");
    }

    // Still guard against extremely large files before reading
    const stats = await stat(zshrcPath);
    if (!validateFileSize(stats.size)) {
      throw new FileTooLargeError(zshrcPath, stats.size, FILE_CONSTANTS.MAX_FILE_SIZE);
    }

    return await readFile(zshrcPath, { encoding: "utf8" });
  } catch (error) {
    if (
      error instanceof FileNotFoundError ||
      error instanceof PermissionError ||
      error instanceof FileTooLargeError ||
      error instanceof ReadError
    ) {
      throw error;
    }

    if (error instanceof Error) {
      const nodeError = error as Error & { code?: string };
      if (nodeError.code === "ENOENT") {
        throw new FileNotFoundError(zshrcPath);
      }
      if (nodeError.code === "EACCES" || nodeError.code === "EPERM") {
        throw new PermissionError(zshrcPath);
      }
      throw new ReadError(zshrcPath, error);
    }
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
    // Validate path for write (allows first-time creation)
    if (!(await validateFilePathForWrite(zshrcPath))) {
      throw new Error("Invalid or unwritable zshrc path");
    }

    // Basic content validation
    if (typeof content !== "string") {
      throw new Error("Content must be a string");
    }

    // Resolve symlink: if ~/.zshrc is a symlink, write to its real target
    let effectivePath = zshrcPath;
    try {
      const lst = await lstat(zshrcPath);
      if (lst.isSymbolicLink()) {
        effectivePath = await realpath(zshrcPath);
      }
    } catch {
      // lstat may fail if file doesn't exist yet; ignore
    }

    // Determine target mode (preserve if file exists on effective path)
    let targetMode = 0o600;
    try {
      const st = await stat(effectivePath);
      targetMode = st.mode & 0o777;
    } catch {
      // file may not exist yet; keep default
    }

    // Atomic write on the effective path
    const tmpPath = `${effectivePath}.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    await writeFile(tmpPath, content, { encoding: "utf8", mode: targetMode });
    await rename(tmpPath, effectivePath);
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
