/**
 * Logging utility for zshrc-manager extension
 *
 * Provides consistent, leveled logging throughout the extension.
 * Logs are output to console and can be viewed in Raycast's developer console.
 */

/** Log levels in order of severity */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/** Current minimum log level - logs below this level are ignored */
let currentLogLevel: LogLevel = LogLevel.DEBUG;

/** Prefix for all log messages */
const LOG_PREFIX = "[zshrc-manager]";

/**
 * Set the minimum log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Format a log message with timestamp and level
 */
function formatMessage(level: string, module: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `${LOG_PREFIX} ${timestamp} [${level}] [${module}] ${message}`;
}

/**
 * Log a debug message
 */
export function debug(module: string, message: string, data?: unknown): void {
  if (currentLogLevel <= LogLevel.DEBUG) {
    const formatted = formatMessage("DEBUG", module, message);
    if (data !== undefined) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
  }
}

/**
 * Log an info message
 */
export function info(module: string, message: string, data?: unknown): void {
  if (currentLogLevel <= LogLevel.INFO) {
    const formatted = formatMessage("INFO", module, message);
    if (data !== undefined) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
  }
}

/**
 * Log a warning message
 */
export function warn(module: string, message: string, data?: unknown): void {
  if (currentLogLevel <= LogLevel.WARN) {
    const formatted = formatMessage("WARN", module, message);
    if (data !== undefined) {
      console.warn(formatted, data);
    } else {
      console.warn(formatted);
    }
  }
}

/**
 * Log an error message
 */
export function error(module: string, message: string, err?: unknown): void {
  if (currentLogLevel <= LogLevel.ERROR) {
    const formatted = formatMessage("ERROR", module, message);
    if (err !== undefined) {
      console.error(formatted, err);
    } else {
      console.error(formatted);
    }
  }
}

/**
 * Create a logger instance for a specific module
 */
export function createLogger(module: string) {
  return {
    debug: (message: string, data?: unknown) => debug(module, message, data),
    info: (message: string, data?: unknown) => info(module, message, data),
    warn: (message: string, data?: unknown) => warn(module, message, data),
    error: (message: string, err?: unknown) => error(module, message, err),
  };
}

/** Pre-configured loggers for common modules */
export const log = {
  zsh: createLogger("zsh"),
  parse: createLogger("parse"),
  history: createLogger("history"),
  edit: createLogger("edit"),
  delete: createLogger("delete"),
  cache: createLogger("cache"),
  preferences: createLogger("preferences"),
  ui: createLogger("ui"),
};
