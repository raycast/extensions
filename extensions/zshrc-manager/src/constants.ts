/**
 * Application constants
 *
 * Centralized location for all magic numbers, strings, and configuration values
 * used throughout the application.
 */

/**
 * Display and UI constants
 */
export const DISPLAY_CONSTANTS = {
  /** Maximum length for truncated values in middle truncation */
  TRUNCATE_LIMIT: 120,

  /** Maximum number of aliases to show in summary view */
  MAX_ALIASES_SUMMARY: 20,

  /** Maximum number of exports to show in summary view */
  MAX_EXPORTS_SUMMARY: 20,

  /** Maximum number of aliases to show in combined view */
  MAX_ALIASES_COMBINED: 10,

  /** Maximum number of exports to show in combined view */
  MAX_EXPORTS_COMBINED: 10,
} as const;

/**
 * File system constants
 */
export const FILE_CONSTANTS = {
  /** Maximum file size for zshrc files (in bytes) */
  MAX_FILE_SIZE: 1024 * 1024, // 1MB

  /** Default zshrc filename */
  ZSHRC_FILENAME: ".zshrc",

  /** Maximum content length after reading (in characters) */
  MAX_CONTENT_LENGTH: 10000,

  /** Maximum line length to prevent DoS attacks (in characters) */
  MAX_LINE_LENGTH: 1000,
} as const;

/**
 * Parsing constants
 */
export const PARSING_CONSTANTS = {
  /** Supported section header formats */
  SECTION_FORMATS: {
    // Format 1: Simple labeled sections
    LABELED: /^(?:\s*)#\s*section\s*:\s*(.+?)\s*$/i,

    // Format 2: Dashed sections with start/end markers
    DASHED_START: /^(?:\s*)#\s*---\s*(?!End\b)(.+?)\s*---\s*#\s*$/i,
    DASHED_END: /^(?:\s*)#\s*---\s*End\s+.*---\s*#\s*$/i,

    // Format 3: Bracketed sections [Section Name]
    BRACKETED: /^(?:\s*)#\s*\[\s*(.+?)\s*\]\s*$/i,

    // Format 4: Hash sections ## Section Name
    HASH: /^(?:\s*)#\s*#\s*(.+?)\s*$/i,

    // Format 5: Custom start/end tags (configurable)
    CUSTOM_START: /^(?:\s*)#\s*@start\s+(.+?)\s*$/i,
    CUSTOM_END: /^(?:\s*)#\s*@end\s+(.+?)\s*$/i,

    // Format 6: Function-style sections function_name() {
    FUNCTION_START: /^(?:\s*)([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*\{\s*$/,
    FUNCTION_END: /^(?:\s*)\}\s*$/,
  },

  /** Regex patterns for parsing zsh content */
  PATTERNS: {
    ALIAS: /^(?:\s*)alias\s+([A-Za-z0-9_.:-]+)=(?:'|")(.*?)(?:'|")(?:\s*)$/,
    EXPORT: /^(?:\s*)(?:export|typeset\s+-x)\s+([A-Za-z_][A-Za-z0-9_]*)=(.*?)(?:\s*)$/,
    EVAL: /^(?:\s*)eval\s+(.+?)(?:\s*)$/,
    SETOPT: /^(?:\s*)setopt\s+(.+?)(?:\s*)$/,
    PLUGIN: /^(?:\s*)plugins\s*=\s*\(([^)]+)\)(?:\s*)$/,
    FUNCTION: /^(?:\s*)([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*\{(?:\s*)$/,
    SOURCE: /^(?:\s*)source\s+(.+?)(?:\s*)$/,
    AUTOLOAD: /^(?:\s*)autoload\s+(?:-Uz\s+)?([A-Za-z_][A-Za-z0-9_]*)(?:\s*)$/,
    FPATH: /^(?:\s*)fpath\s*=\s*\(([^)]+)\)(?:\s*)$/,
    PATH: /^(?:\s*)PATH\s*=\s*(.+?)(?:\s*)$/,
    THEME: /^(?:\s*)ZSH_THEME\s*=\s*(?:'|")(.*?)(?:'|")(?:\s*)$/,
    COMPLETION: /^(?:\s*)compinit(?:\s*)$/,
    HISTORY: /^(?:\s*)HIST[A-Z_]*\s*=\s*(.+?)(?:\s*)$/,
    KEYBINDING: /^(?:\s*)bindkey\s+(.+?)(?:\s*)$/,
  },

  /** Section detection priorities (higher number = higher priority) */
  SECTION_PRIORITIES: {
    CUSTOM_START: 6,
    CUSTOM_END: 6,
    DASHED_START: 5,
    DASHED_END: 5,
    BRACKETED: 4,
    HASH: 3,
    FUNCTION_START: 2,
    FUNCTION_END: 2,
    LABELED: 1,
  },
} as const;

/**
 * Cache constants
 */
export const CACHE_CONSTANTS = {
  /** Default TTL for cached content (in milliseconds) */
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes

  /** Cache key prefix */
  KEY_PREFIX: "zsh-manager",
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  FILE_NOT_FOUND: "~/.zshrc file not found",
  PERMISSION_DENIED: "Permission denied reading ~/.zshrc",
  FILE_TOO_LARGE: "~/.zshrc file is too large",
  PARSE_ERROR: "Failed to parse ~/.zshrc content",
  READ_ERROR: "Failed to read ~/.zshrc file",
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  WELCOME_SEEN: "zsh-manager/welcomeSeen",
} as const;

/**
 * Modern color palette for UI elements
 */
export const MODERN_COLORS = {
  primary: "#007AFF",
  success: "#34C759",
  warning: "#FF9500",
  error: "#FF3B30",
  neutral: "#8E8E93",
} as const;
