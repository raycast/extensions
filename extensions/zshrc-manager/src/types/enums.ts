/**
 * Enums and constants for zsh-manager extension
 *
 * Centralized definitions for all enums and constant values
 * used throughout the application.
 */

/**
 * Types of entries that can be parsed from zshrc files
 */
export enum EntryType {
  ALIAS = "alias",
  EXPORT = "export",
  EVAL = "eval",
  SETOPT = "setopt",
  PLUGIN = "plugin",
  FUNCTION = "function",
  SOURCE = "source",
  AUTOLOAD = "autoload",
  FPATH = "fpath",
  PATH = "path",
  THEME = "theme",
  COMPLETION = "completion",
  HISTORY = "history",
  KEYBINDING = "keybinding",
  OTHER = "other",
}

/**
 * Section marker types for detecting logical sections
 */
export enum SectionMarkerType {
  LABELED = "labeled",
  DASHED_START = "dashed_start",
  DASHED_END = "dashed_end",
  BRACKETED = "bracketed",
  HASH = "hash",
  CUSTOM_START = "custom_start",
  CUSTOM_END = "custom_end",
  FUNCTION_START = "function_start",
  FUNCTION_END = "function_end",
}

/**
 * Error codes for different types of errors
 */
export enum ErrorCode {
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  READ_ERROR = "READ_ERROR",
  WRITE_ERROR = "WRITE_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  PARSE_ERROR = "PARSE_ERROR",
}

/**
 * Icon names for different entry types
 */
export enum EntryIcon {
  ALIAS = "Terminal",
  EXPORT = "EnvironmentVariable",
  EVAL = "Code",
  SETOPT = "Gear",
  PLUGIN = "PuzzlePiece",
  FUNCTION = "Function",
  SOURCE = "Document",
  AUTOLOAD = "Download",
  FPATH = "Folder",
  PATH = "Path",
  THEME = "Palette",
  COMPLETION = "CheckCircle",
  HISTORY = "Clock",
  KEYBINDING = "Keyboard",
  OTHER = "File",
}

/**
 * Section icon names
 */
export enum SectionIcon {
  GENERAL = "Gear",
  ALIASES = "Terminal",
  EXPORTS = "EnvironmentVariable",
  FUNCTIONS = "Function",
  PLUGINS = "PuzzlePiece",
  SOURCES = "Document",
  EVALS = "Code",
  SETOPTS = "Settings",
  THEMES = "Palette",
  COMPLETIONS = "CheckCircle",
  HISTORY = "Clock",
  KEYBINDINGS = "Keyboard",
  OTHER = "File",
}

/**
 * Toast styles for different message types
 */
export enum ToastStyle {
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
  ANIMATION = "ANIMATION",
}

/**
 * Form validation states
 */
export enum ValidationState {
  VALID = "valid",
  INVALID = "invalid",
  PENDING = "pending",
}

/**
 * Loading states for different operations
 */
export enum LoadingState {
  IDLE = "idle",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}
