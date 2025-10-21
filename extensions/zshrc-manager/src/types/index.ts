/**
 * Centralized type definitions for zsh-manager extension
 *
 * This module exports all shared types, interfaces, and enums
 * used throughout the application to ensure consistency and
 * maintainability.
 */

// Re-export all types from their respective modules
export type {
  BaseEntry,
  AliasEntry,
  ExportEntry,
  EvalEntry,
  SetoptEntry,
  PluginEntry,
  FunctionEntry,
  SourceEntry,
  AutoloadEntry,
  FpathEntry,
  PathEntry,
  ThemeEntry,
  CompletionEntry,
  HistoryEntry,
  KeybindingEntry,
  ZshEntry,
  LogicalSection,
} from "../lib/parse-zshrc";

export { EntryType } from "./enums";

export type { ZshrcStatistics } from "../utils/statistics";

export type { SectionMarker, SectionContext } from "../lib/section-detector";

export { SectionMarkerType } from "./enums";

export type { ParsedSectionContent } from "../utils/markdown";

// Hook types
export interface FilterableItem {
  readonly name: string;
  readonly command?: string;
  readonly sectionLabel?: string;
  [key: string]: unknown;
}

export interface UseZshrcFilterResult<T extends FilterableItem> {
  readonly filteredItems: T[];
  readonly searchText: string;
  readonly setSearchText: (text: string) => void;
  readonly clearSearch: () => void;
}

export interface UseZshrcLoaderResult {
  readonly isLoading: boolean;
  readonly content: string | null;
  readonly sections: import("../lib/parse-zshrc").LogicalSection[];
  readonly statistics: import("../utils/statistics").ZshrcStatistics | null;
  readonly lastError: Error | null;
}

// Form component props
export interface EditAliasProps {
  /** Existing alias name (for editing) */
  existingName?: string;
  /** Existing alias command (for editing) */
  existingCommand?: string;
  /** Section where this alias belongs */
  sectionLabel?: string;
  /** Callback when alias is saved */
  onSave?: () => void;
}

export interface EditExportProps {
  /** Existing variable name (for editing) */
  existingVariable?: string;
  /** Existing variable value (for editing) */
  existingValue?: string;
  /** Section where this export belongs */
  sectionLabel?: string;
  /** Callback when export is saved */
  onSave?: () => void;
}

// Re-export error types from utils
export {
  ZshManagerError,
  FileNotFoundError,
  PermissionError,
  FileTooLargeError,
  ParseError,
  ReadError,
  WriteError,
  isZshManagerError,
  getUserFriendlyErrorMessage,
} from "../utils/errors";

// Validation result types
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
}

// Cache types
export interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: number;
  readonly ttl: number;
}

export interface CacheOptions {
  readonly ttl?: number;
  readonly maxSize?: number;
}
