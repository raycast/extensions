/**
 * Zsh configuration file operations
 *
 * Provides functions to read and validate zshrc files with enhanced
 * error handling and security checks.
 */

import { homedir } from "node:os";
import { readFile, writeFile, stat, rename, lstat, realpath, copyFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getPreferenceValues } from "@raycast/api";
import { FILE_CONSTANTS, ERROR_MESSAGES } from "../constants";
import { FileNotFoundError, PermissionError, FileTooLargeError, ReadError, WriteError } from "../utils/errors";
import {
  validateFilePath,
  validateFileSize,
  truncateContent,
  validateFilePathForWrite,
  validateZshrcContent,
} from "../utils/sanitize";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { log } from "../utils/logger";

/** Backup file extension */
const BACKUP_EXTENSION = ".bak";

/** Mapping of config file types to their filenames */
const CONFIG_FILES: Record<string, string> = {
  zshrc: ".zshrc",
  zprofile: ".zprofile",
  zshenv: ".zshenv",
};

/**
 * Gets the shell config file path from preferences or default location.
 * Supports .zshrc, .zprofile, and .zshenv files.
 *
 * @returns The config file path
 */
export function getZshrcPath(): string {
  const prefs = getPreferenceValues<Preferences>();

  // Custom path takes precedence if enabled
  if (prefs["enableCustomZshrcPath"] && prefs["customZshrcPath"]) {
    let customPath = prefs["customZshrcPath"];

    // Expand ~ to home directory
    if (customPath.startsWith("~")) {
      customPath = customPath.replace("~", homedir());
    }

    return customPath;
  }

  // Use selected config file type, default to .zshrc
  const configType = (prefs["configFileType"] as string) || "zshrc";
  const filename = CONFIG_FILES[configType] || FILE_CONSTANTS.ZSHRC_FILENAME;

  return `${homedir()}/${filename}`;
}

/**
 * Gets the current config file type being managed
 *
 * @returns The config file type (zshrc, zprofile, or zshenv)
 */
export function getConfigFileType(): string {
  const prefs = getPreferenceValues<Preferences>();

  if (prefs["enableCustomZshrcPath"] && prefs["customZshrcPath"]) {
    // Determine type from custom path filename
    const path = prefs["customZshrcPath"];
    if (path.includes(".zprofile")) return "zprofile";
    if (path.includes(".zshenv")) return "zshenv";
    return "zshrc";
  }

  return (prefs["configFileType"] as string) || "zshrc";
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
  log.zsh.debug(`Reading zshrc file: ${zshrcPath}`);

  try {
    // Validate file path
    if (!(await validateFilePath(zshrcPath))) {
      log.zsh.error(`Invalid file path: ${zshrcPath}`);
      throw new Error("Invalid file path");
    }

    // Check file size before reading
    const stats = await stat(zshrcPath);
    log.zsh.debug(`File size: ${stats.size} bytes`);
    if (!validateFileSize(stats.size)) {
      log.zsh.error(`File too large: ${stats.size} bytes (max: ${FILE_CONSTANTS.MAX_FILE_SIZE})`);
      throw new FileTooLargeError(zshrcPath, stats.size, FILE_CONSTANTS.MAX_FILE_SIZE);
    }

    const fileContents = await readFile(zshrcPath, { encoding: "utf8" });

    // Truncate content if it's still too large after reading
    const safeContent = truncateContent(fileContents);
    log.zsh.info(`Successfully read zshrc file (${safeContent.length} chars)`);

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
 * Creates a backup of the zshrc file before making changes.
 * The backup is stored as {filename}.bak in the same directory.
 *
 * @param filePath Path to the file to backup
 * @returns Promise resolving to the backup path, or null if file doesn't exist
 */
async function createBackup(filePath: string): Promise<string | null> {
  try {
    // Check if file exists before trying to backup
    await access(filePath, constants.F_OK);

    const backupPath = `${filePath}${BACKUP_EXTENSION}`;
    await copyFile(filePath, backupPath);
    return backupPath;
  } catch (error) {
    // Only ignore ENOENT (file doesn't exist), rethrow other errors
    if (error instanceof Error && (error as Error & { code?: string }).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Gets the path to the backup file for the current zshrc
 *
 * @returns The backup file path
 */
export function getBackupPath(): string {
  return `${getZshrcPath()}${BACKUP_EXTENSION}`;
}

/**
 * Restores the zshrc file from its backup
 *
 * @returns Promise resolving when restore is complete
 * @throws {Error} When backup file doesn't exist or restore fails
 */
export async function restoreFromBackup(): Promise<void> {
  const zshrcPath = getZshrcPath();
  const backupPath = getBackupPath();

  try {
    await access(backupPath, constants.R_OK);
    await copyFile(backupPath, zshrcPath);
  } catch (error) {
    if (error instanceof Error && (error as Error & { code?: string }).code === "ENOENT") {
      throw new Error("No backup file found");
    }
    throw error;
  }
}

/**
 * Information about a backup file
 */
export interface BackupInfo {
  /** Whether backup exists */
  exists: boolean;
  /** Backup file path */
  path: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  modifiedAt: Date | null;
  /** Human-readable size */
  sizeFormatted: string;
}

/**
 * Gets information about the backup file
 *
 * @returns Promise resolving to backup info
 */
export async function getBackupInfo(): Promise<BackupInfo> {
  const backupPath = getBackupPath();

  try {
    const stats = await stat(backupPath);
    const size = stats.size;

    // Format size for display
    let sizeFormatted: string;
    if (size < 1024) {
      sizeFormatted = `${size} B`;
    } else if (size < 1024 * 1024) {
      sizeFormatted = `${(size / 1024).toFixed(1)} KB`;
    } else {
      sizeFormatted = `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }

    return {
      exists: true,
      path: backupPath,
      size,
      modifiedAt: stats.mtime,
      sizeFormatted,
    };
  } catch {
    return {
      exists: false,
      path: backupPath,
      size: 0,
      modifiedAt: null,
      sizeFormatted: "0 B",
    };
  }
}

/**
 * Reads the backup file content
 *
 * @returns Promise resolving to the backup content, or null if not found
 */
export async function readBackupFile(): Promise<string | null> {
  const backupPath = getBackupPath();

  try {
    await access(backupPath, constants.F_OK);
    return await readFile(backupPath, { encoding: "utf8" });
  } catch {
    return null;
  }
}

/**
 * Deletes the backup file by moving it to trash for safer deletion
 *
 * @returns Promise resolving when deletion is complete
 * @throws {Error} When deletion fails
 */
export async function deleteBackup(): Promise<void> {
  const backupPath = getBackupPath();
  const { trash } = await import("@raycast/api");

  try {
    await access(backupPath, constants.F_OK);
    await trash(backupPath);
  } catch (error) {
    if (error instanceof Error && (error as Error & { code?: string }).code === "ENOENT") {
      throw new Error("No backup file found to delete");
    }
    throw error;
  }
}

/**
 * Writes content to the zshrc file with enhanced error handling and validation.
 * Creates a backup of the existing file before writing.
 *
 * @param content The content to write to the file
 * @returns Promise resolving when the write operation completes
 * @throws {PermissionError} When file write access is denied
 * @throws {WriteError} When file writing fails for other reasons
 */
export async function writeZshrcFile(content: string): Promise<void> {
  const zshrcPath = getZshrcPath();
  log.zsh.info(`Writing to zshrc file: ${zshrcPath} (${content.length} chars)`);

  try {
    // Validate path for write (allows first-time creation)
    if (!(await validateFilePathForWrite(zshrcPath))) {
      log.zsh.error(`Invalid or unwritable path: ${zshrcPath}`);
      throw new Error("Invalid or unwritable zshrc path");
    }

    // Basic content validation
    if (typeof content !== "string") {
      log.zsh.error("Content is not a string");
      throw new Error("Content must be a string");
    }

    // Validate content for dangerous patterns
    const contentValidation = validateZshrcContent(content);
    if (!contentValidation.isValid) {
      log.zsh.error(`Content validation failed: ${contentValidation.errors.join("; ")}`);
      throw new WriteError(zshrcPath, new Error(`Content validation failed: ${contentValidation.errors.join("; ")}`));
    }

    // Resolve symlink: if ~/.zshrc is a symlink, write to its real target
    let effectivePath = zshrcPath;
    try {
      const lst = await lstat(zshrcPath);
      if (lst.isSymbolicLink()) {
        effectivePath = await realpath(zshrcPath);
        log.zsh.debug(`Resolved symlink to: ${effectivePath}`);
      }
    } catch {
      // lstat may fail if file doesn't exist yet; ignore
    }

    // Create backup of existing file before writing
    log.zsh.debug("Creating backup before write");
    await createBackup(effectivePath);

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
    log.zsh.debug(`Writing to temp file: ${tmpPath}`);

    await writeFile(tmpPath, content, { encoding: "utf8", mode: targetMode });
    await rename(tmpPath, effectivePath);
    log.zsh.info(`Successfully wrote zshrc file: ${effectivePath}`);
  } catch (error) {
    log.zsh.error("Write failed", error);
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
