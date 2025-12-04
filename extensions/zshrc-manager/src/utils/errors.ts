/**
 * Custom error types for zsh-manager
 *
 * Provides specific error classes for different failure scenarios
 * with actionable error messages and context.
 */

/**
 * Base error class for zsh-manager specific errors
 */
export abstract class ZshManagerError extends Error {
  abstract readonly code: string;
  abstract readonly userMessage: string;

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error thrown when the zshrc file cannot be found
 */
export class FileNotFoundError extends ZshManagerError {
  readonly code = "FILE_NOT_FOUND";
  readonly userMessage = "~/.zshrc file not found. Please ensure the file exists in your home directory.";

  constructor(filePath: string) {
    super(`Zshrc file not found: ${filePath}`, { filePath });
  }
}

/**
 * Error thrown when there are insufficient permissions to read the zshrc file
 */
export class PermissionError extends ZshManagerError {
  readonly code = "PERMISSION_DENIED";
  readonly userMessage = "Permission denied reading ~/.zshrc. Please check file permissions.";

  constructor(filePath: string) {
    super(`Permission denied reading file: ${filePath}`, { filePath });
  }
}

/**
 * Error thrown when the zshrc file is too large to process
 */
export class FileTooLargeError extends ZshManagerError {
  readonly code = "FILE_TOO_LARGE";
  readonly userMessage = "~/.zshrc file is too large to process. Please reduce file size.";

  constructor(filePath: string, fileSize: number, maxSize: number) {
    super(`File too large: ${filePath} (${fileSize} bytes, max: ${maxSize})`, {
      filePath,
      fileSize,
      maxSize,
    });
  }
}

/**
 * Error thrown when parsing zshrc content fails
 */
export class ParseError extends ZshManagerError {
  readonly code = "PARSE_ERROR";
  readonly userMessage = "Failed to parse ~/.zshrc content. Please check for syntax errors.";

  constructor(message: string, lineNumber?: number, content?: string) {
    super(`Parse error: ${message}`, { lineNumber, content });
  }
}

/**
 * Error thrown when reading the zshrc file fails for other reasons
 */
export class ReadError extends ZshManagerError {
  readonly code = "READ_ERROR";
  readonly userMessage = "Failed to read ~/.zshrc file. Please try again.";

  constructor(filePath: string, originalError: Error) {
    super(`Read error for ${filePath}: ${originalError.message}`, {
      filePath,
      originalError: originalError.message,
    });
  }
}

/**
 * Error thrown when writing to the zshrc file fails
 */
export class WriteError extends ZshManagerError {
  readonly code = "WRITE_ERROR";
  readonly userMessage = "Failed to write to ~/.zshrc file. Please try again.";

  constructor(filePath: string, originalError?: Error) {
    super(`Write error for ${filePath}: ${originalError?.message || "Unknown error"}`, {
      filePath,
      originalError: originalError?.message,
    });
  }
}

/**
 * Type guard to check if an error is a ZshManagerError
 */
export function isZshManagerError(error: unknown): error is ZshManagerError {
  return error instanceof ZshManagerError;
}

/**
 * Get user-friendly error message from any error
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (isZshManagerError(error)) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}
