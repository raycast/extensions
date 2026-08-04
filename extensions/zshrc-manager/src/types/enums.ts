/**
 * Shared constant unions for the zshrc manager extension
 *
 * Plain `as const` objects with matching union types — no TypeScript
 * enums, so the values stay erasable and structurally typed.
 */

/**
 * Types of entries that can be parsed from zshrc files
 */
export const EntryType = {
  ALIAS: "alias",
  EXPORT: "export",
  EVAL: "eval",
  SETOPT: "setopt",
  PLUGIN: "plugin",
  FUNCTION: "function",
  SOURCE: "source",
  AUTOLOAD: "autoload",
  FPATH: "fpath",
  PATH: "path",
  THEME: "theme",
  COMPLETION: "completion",
  HISTORY: "history",
  KEYBINDING: "keybinding",
  OTHER: "other",
} as const;

export type EntryType = (typeof EntryType)[keyof typeof EntryType];

/**
 * Section marker types for detecting logical sections
 */
export const SectionMarkerType = {
  LABELED: "labeled",
  DASHED_START: "dashed_start",
  DASHED_END: "dashed_end",
  BRACKETED: "bracketed",
  HASH: "hash",
  CUSTOM_START: "custom_start",
  CUSTOM_END: "custom_end",
  FUNCTION_START: "function_start",
  FUNCTION_END: "function_end",
} as const;

export type SectionMarkerType = (typeof SectionMarkerType)[keyof typeof SectionMarkerType];
