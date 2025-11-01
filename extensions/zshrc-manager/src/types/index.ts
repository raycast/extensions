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
  ZshEntry,
  LogicalSection,
} from "../lib/parse-zshrc";

export { EntryType } from "./enums";

export type { ZshrcStatistics } from "../utils/statistics";

export type { SectionMarker, SectionContext } from "../lib/section-detector";

export { SectionMarkerType } from "./enums";

export type { ParsedSectionContent } from "../utils/markdown";

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
