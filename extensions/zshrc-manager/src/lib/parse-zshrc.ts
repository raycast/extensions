/**
 * Zsh configuration file parsing utilities
 *
 * Provides functions to parse zshrc files into structured sections,
 * detect aliases and exports, and categorize entries by type.
 */

import { FILE_CONSTANTS } from "../constants";
import {
  countAllPatterns,
  countUnrecognizedLines,
  extractDetailed,
  multilineArrayInteriorLines,
  type RegistryEntries,
} from "./pattern-registry";
import { detectSectionMarker, updateSectionContext, type SectionContext } from "./section-detector";

import { EntryType } from "../types/enums";

/**
 * Maximum line length to process with regex.
 * Lines longer than this are skipped to prevent ReDoS attacks.
 */
const MAX_SAFE_LINE_LENGTH = FILE_CONSTANTS.MAX_LINE_LENGTH;

/**
 * Base interface for all zshrc entries
 */
export interface BaseEntry {
  /** The type of entry */
  readonly type: EntryType;
  /** Line number in the original file (1-indexed) */
  readonly lineNumber: number;
  /** Original line content from the file */
  readonly originalLine: string;
  /** Optional section label if the entry is within a labeled section */
  readonly sectionLabel: string | undefined;
}

// ============================================================================
// Generic Entry Types - reduce duplication for common field patterns
// ============================================================================

/** Generic entry with a `name` field (Plugin, Function, Theme) */
interface NamedEntry<T extends EntryType> extends BaseEntry {
  readonly type: T;
  readonly name: string;
}

/** Generic entry with a `command` field (Eval, Completion, Keybinding) */
interface CommandEntry<T extends EntryType> extends BaseEntry {
  readonly type: T;
  readonly command: string;
}

/** Generic entry with `variable` and `value` fields (Export, History) */
interface VariableValueEntry<T extends EntryType> extends BaseEntry {
  readonly type: T;
  readonly variable: string;
  readonly value: string;
}

// ============================================================================
// Concrete Entry Types
// ============================================================================

/** Alias: name + command */
export interface AliasEntry extends BaseEntry {
  readonly type: typeof EntryType.ALIAS;
  readonly name: string;
  readonly command: string;
}

/** Export: variable + value */
export type ExportEntry = VariableValueEntry<typeof EntryType.EXPORT>;

/** Eval: command */
export type EvalEntry = CommandEntry<typeof EntryType.EVAL>;

/** Setopt: option */
export interface SetoptEntry extends BaseEntry {
  readonly type: typeof EntryType.SETOPT;
  readonly option: string;
}

/** Plugin: name */
export type PluginEntry = NamedEntry<typeof EntryType.PLUGIN>;

/** Function: name */
export type FunctionEntry = NamedEntry<typeof EntryType.FUNCTION>;

/** Source: path */
export interface SourceEntry extends BaseEntry {
  readonly type: typeof EntryType.SOURCE;
  readonly path: string;
}

/** Autoload: function name */
export interface AutoloadEntry extends BaseEntry {
  readonly type: typeof EntryType.AUTOLOAD;
  readonly function: string;
}

/** Fpath: directories array */
export interface FpathEntry extends BaseEntry {
  readonly type: typeof EntryType.FPATH;
  readonly directories: string[];
}

/** Path: value */
export interface PathEntry extends BaseEntry {
  readonly type: typeof EntryType.PATH;
  readonly value: string;
}

/** Theme: name */
export type ThemeEntry = NamedEntry<typeof EntryType.THEME>;

/** Completion: command */
export type CompletionEntry = CommandEntry<typeof EntryType.COMPLETION>;

/** History config: variable + value */
export type HistoryEntry = VariableValueEntry<typeof EntryType.HISTORY>;

/** Keybinding: command */
export type KeybindingEntry = CommandEntry<typeof EntryType.KEYBINDING>;

/**
 * Union type for all possible zshrc entries
 */
export type ZshEntry =
  | AliasEntry
  | ExportEntry
  | EvalEntry
  | SetoptEntry
  | PluginEntry
  | FunctionEntry
  | SourceEntry
  | AutoloadEntry
  | FpathEntry
  | PathEntry
  | ThemeEntry
  | CompletionEntry
  | HistoryEntry
  | KeybindingEntry
  | BaseEntry;

/**
 * Represents a logical section of zshrc content
 */
export interface LogicalSection {
  /** Section label; "Unlabeled" if none */
  readonly label: string;
  /** First line number included in section (1-indexed) */
  readonly startLine: number;
  /** Last line number included in section (inclusive) */
  readonly endLine: number;
  /** Raw content for the section */
  readonly content: string;
  /** Number of aliases in this section */
  readonly aliasCount: number;
  /** Number of exports in this section */
  readonly exportCount: number;
  /** Number of evals in this section */
  readonly evalCount: number;
  /** Number of setopts in this section */
  readonly setoptCount: number;
  /** Number of plugins in this section */
  readonly pluginCount: number;
  /** Number of functions in this section */
  readonly functionCount: number;
  /** Number of source commands in this section */
  readonly sourceCount: number;
  /** Number of autoload commands in this section */
  readonly autoloadCount: number;
  /** Number of fpath entries in this section */
  readonly fpathCount: number;
  /** Number of PATH entries in this section */
  readonly pathCount: number;
  /** Number of theme entries in this section */
  readonly themeCount: number;
  /** Number of completion entries in this section */
  readonly completionCount: number;
  /** Number of history entries in this section */
  readonly historyCount: number;
  /** Number of keybinding entries in this section */
  readonly keybindingCount: number;
  /** Number of other entries in this section */
  readonly otherCount: number;
}

/**
 * Base entry data without the type discriminant
 */
interface BaseEntryData {
  readonly lineNumber: number;
  readonly originalLine: string;
  readonly sectionLabel: string | undefined;
}

/**
 * Creates base entry data with common fields
 */
function createBaseEntryData(lineNumber: number, rawLine: string, sectionLabel: string | undefined): BaseEntryData {
  return {
    lineNumber,
    originalLine: rawLine,
    sectionLabel,
  };
}

// ============================================================================
// Generic Factory Helpers - reduce factory duplication
// ============================================================================

/** Factory for NamedEntry types (Plugin, Function, Theme) */
const createNamedEntry =
  <T extends EntryType>(type: T) =>
  (base: BaseEntryData, data: { name: string }) => ({ type, ...base, name: data.name });

/** Factory for CommandEntry types (Eval, Completion, Keybinding) */
const createCommandEntry =
  <T extends EntryType>(type: T) =>
  (base: BaseEntryData, data: { command: string }) => ({ type, ...base, command: data.command });

/** Factory for VariableValueEntry types (Export, History) */
const createVariableValueEntry =
  <T extends EntryType>(type: T) =>
  (base: BaseEntryData, data: { variable: string; value: string }) => ({
    type,
    ...base,
    variable: data.variable,
    value: data.value,
  });

/**
 * Type-safe factory functions for creating entry types
 */
const entryFactories = {
  [EntryType.ALIAS]: (base: BaseEntryData, data: { name: string; command: string }): AliasEntry => ({
    type: EntryType.ALIAS,
    ...base,
    name: data.name,
    command: data.command,
  }),
  [EntryType.EXPORT]: createVariableValueEntry(EntryType.EXPORT),
  [EntryType.EVAL]: createCommandEntry(EntryType.EVAL),
  [EntryType.SETOPT]: (base: BaseEntryData, data: { option: string }): SetoptEntry => ({
    type: EntryType.SETOPT,
    ...base,
    option: data.option,
  }),
  [EntryType.PLUGIN]: createNamedEntry(EntryType.PLUGIN),
  [EntryType.FUNCTION]: createNamedEntry(EntryType.FUNCTION),
  [EntryType.SOURCE]: (base: BaseEntryData, data: { path: string }): SourceEntry => ({
    type: EntryType.SOURCE,
    ...base,
    path: data.path,
  }),
  [EntryType.AUTOLOAD]: (base: BaseEntryData, data: { function: string }): AutoloadEntry => ({
    type: EntryType.AUTOLOAD,
    ...base,
    function: data.function,
  }),
  [EntryType.FPATH]: (base: BaseEntryData, data: { directories: string[] }): FpathEntry => ({
    type: EntryType.FPATH,
    ...base,
    directories: data.directories,
  }),
  [EntryType.PATH]: (base: BaseEntryData, data: { value: string }): PathEntry => ({
    type: EntryType.PATH,
    ...base,
    value: data.value,
  }),
  [EntryType.THEME]: createNamedEntry(EntryType.THEME),
  [EntryType.COMPLETION]: createCommandEntry(EntryType.COMPLETION),
  [EntryType.HISTORY]: createVariableValueEntry(EntryType.HISTORY),
  [EntryType.KEYBINDING]: createCommandEntry(EntryType.KEYBINDING),
  [EntryType.OTHER]: (base: BaseEntryData): BaseEntry => ({
    type: EntryType.OTHER,
    ...base,
  }),
} as const;

/**
 * Builds a per-line index of the registry's extraction so section context
 * can be attached while walking the file. One line can carry several
 * entries (array declarations, or an `export PATH=…` that is both an
 * export and a PATH declaration).
 */
function buildEntriesByLine(extracted: RegistryEntries): Map<number, Array<(base: BaseEntryData) => ZshEntry>> {
  const byLine = new Map<number, Array<(base: BaseEntryData) => ZshEntry>>();
  const add = (line: number, build: (base: BaseEntryData) => ZshEntry) => {
    const list = byLine.get(line) ?? [];
    list.push(build);
    byLine.set(line, list);
  };

  for (const e of extracted.aliases)
    add(e.line, (b) => entryFactories[EntryType.ALIAS](b, { name: e.name, command: e.command }));
  for (const e of extracted.exports)
    add(e.line, (b) => entryFactories[EntryType.EXPORT](b, { variable: e.variable, value: e.value }));
  for (const e of extracted.evals) add(e.line, (b) => entryFactories[EntryType.EVAL](b, { command: e.command }));
  for (const e of extracted.setopts) add(e.line, (b) => entryFactories[EntryType.SETOPT](b, { option: e.option }));
  for (const e of extracted.plugins) add(e.line, (b) => entryFactories[EntryType.PLUGIN](b, { name: e.name }));
  for (const e of extracted.functions) add(e.line, (b) => entryFactories[EntryType.FUNCTION](b, { name: e.name }));
  for (const e of extracted.sources) add(e.line, (b) => entryFactories[EntryType.SOURCE](b, { path: e.path }));
  for (const e of extracted.autoloads)
    add(e.line, (b) => entryFactories[EntryType.AUTOLOAD](b, { function: e.function }));
  for (const e of extracted.fpathEntries)
    add(e.line, (b) => entryFactories[EntryType.FPATH](b, { directories: [e.entry] }));
  for (const e of extracted.pathEntries) add(e.line, (b) => entryFactories[EntryType.PATH](b, { value: e.entry }));
  for (const e of extracted.themes) add(e.line, (b) => entryFactories[EntryType.THEME](b, { name: e.name }));
  for (const e of extracted.completions)
    add(e.line, (b) => entryFactories[EntryType.COMPLETION](b, { command: e.command }));
  for (const e of extracted.history)
    add(e.line, (b) => entryFactories[EntryType.HISTORY](b, { variable: e.variable, value: e.value }));
  for (const e of extracted.keybindings)
    add(e.line, (b) =>
      entryFactories[EntryType.KEYBINDING](b, {
        command: b.originalLine.replace(/^\s*bindkey\s+/, "").trim(),
      }),
    );

  return byLine;
}

/**
 * Parses zshrc content into structured entries
 *
 * This function processes zshrc file content line by line, detecting:
 * - Section markers (using configurable patterns from preferences)
 * - Various entry types (aliases, exports, functions, plugins, etc.)
 * - Section context for organizing entries
 *
 * The parser uses a strategy pattern with multiple entry parsers that are
 * tried in order. Each parser has a regex pattern, validation function,
 * and extraction function to convert matches into structured entries.
 *
 * Section detection supports multiple formats:
 * - "# Section: Name" (labeled sections)
 * - "# --- Name --- #" (dashed sections)
 * - "# [Name]" (bracketed sections)
 * - "# ## Name" (hash sections)
 * - Custom patterns from user preferences
 * - Function-style sections: function_name() { ... }
 *
 * @param content The raw zshrc file content to parse
 * @returns Array of parsed entries with metadata including line numbers,
 *          section labels, and type-specific data
 */
export function parseZshrc(content: string): ReadonlyArray<ZshEntry> {
  const lines = content.split(/\r?\n/);
  const entries: ZshEntry[] = [];
  let context: SectionContext = {
    currentSection: undefined,
    sectionStack: [],
    functionLevel: 0,
  };

  // One extraction pass over the whole content — the registry is the
  // single parser; this function only attaches section context.
  const detailed = extractDetailed(content);
  const entriesByLine = buildEntriesByLine(detailed.entries);
  const arrayInterior = multilineArrayInteriorLines(content);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    if (!rawLine) continue;
    const line = rawLine.trim();

    if (line.length === 0) {
      continue;
    }

    // Skip extremely long lines to prevent ReDoS attacks
    if (rawLine.length > MAX_SAFE_LINE_LENGTH) {
      // Still add as OTHER entry to track the line exists
      const baseData = createBaseEntryData(
        index + 1,
        rawLine.slice(0, 100) + "... (truncated)",
        context.currentSection,
      );
      entries.push(entryFactories[EntryType.OTHER](baseData));
      continue;
    }

    // Check for section markers using enhanced detection. Lines inside a
    // multi-line array are never markers — a comment in an array body
    // that happens to look like a section header must not shift context.
    const marker = arrayInterior.has(index + 1) ? null : detectSectionMarker(rawLine, index + 1);
    if (marker) {
      context = updateSectionContext(marker, context);
      continue;
    }

    const builders = entriesByLine.get(index + 1);
    if (builders && builders.length > 0) {
      const baseData = createBaseEntryData(index + 1, rawLine, context.currentSection);
      for (const build of builders) {
        entries.push(build(baseData));
      }
    } else if (!detailed.matchedLines.has(index + 1)) {
      // No registry match — track the line as OTHER. Consumed lines of a
      // multi-line array (body elements, closing paren) are recognized,
      // not OTHER; their entries live on the declaration's opening line.
      const baseData = createBaseEntryData(index + 1, rawLine, context.currentSection);
      entries.push(entryFactories[EntryType.OTHER](baseData));
    }
  }

  return entries;
}

/**
 * Converts zshrc content into logical sections
 *
 * Parses the content and groups it into labeled sections, merging
 * adjacent unlabeled content into a single "Other Sections" group.
 *
 * @param content The raw zshrc file content
 * @returns Array of logical sections with metadata
 */
export function toLogicalSections(content: string): ReadonlyArray<LogicalSection> {
  const lines = content.split(/\r?\n/);
  const sections: LogicalSection[] = [];
  let currentLabel: string | undefined;
  let currentStart = 1;
  let context: SectionContext = {
    currentSection: undefined,
    sectionStack: [],
    functionLevel: 0,
  };

  const pushSection = (start: number, end: number, label: string | undefined) => {
    if (end < start) return;
    const slice = lines.slice(start - 1, end);
    const joined = slice.join("\n");

    // Count all entry types using centralized pattern registry
    const counts = countAllPatterns(joined);

    // "Other" counts LINES the registry did not recognize — not a
    // subtraction of entry counts from line counts, which mixes units
    // (a multi-line plugins array is one recognized construct spanning
    // several lines yielding several entries).
    const otherCount = countUnrecognizedLines(joined);

    sections.push({
      label: label?.trim() || "Unlabeled",
      startLine: start,
      endLine: end,
      content: joined,
      aliasCount: counts.aliases,
      exportCount: counts.exports,
      evalCount: counts.evals,
      setoptCount: counts.setopts,
      pluginCount: counts.plugins,
      functionCount: counts.functions,
      sourceCount: counts.sources,
      autoloadCount: counts.autoloads,
      fpathCount: counts.fpaths,
      pathCount: counts.paths,
      themeCount: counts.themes,
      completionCount: counts.completions,
      historyCount: counts.history,
      keybindingCount: counts.keybindings,
      otherCount,
    });
  };

  const arrayInterior = multilineArrayInteriorLines(content);

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw) continue;

    // Use enhanced section detection; lines inside a multi-line array
    // are never markers (see parseZshrc).
    const marker = arrayInterior.has(index + 1) ? null : detectSectionMarker(raw, index + 1);
    if (marker) {
      // Handle end markers
      if (["custom_end", "dashed_end", "function_end"].includes(marker.type)) {
        pushSection(currentStart, index, currentLabel);
        currentLabel = undefined;
        currentStart = index + 2;
        context = updateSectionContext(marker, context);
        continue;
      }

      // Handle start markers
      if (["custom_start", "dashed_start", "bracketed", "hash", "labeled", "function_start"].includes(marker.type)) {
        pushSection(currentStart, index, currentLabel);
        currentLabel = marker.name;
        currentStart = index + 2;
        context = updateSectionContext(marker, context);
      }
    }
  }

  // tail section
  pushSection(currentStart, lines.length, currentLabel);

  // Merge adjacent unlabeled chunks to a single logical unit
  const merged: LogicalSection[] = [];
  for (const s of sections) {
    const last = merged[merged.length - 1];
    if (last && last.label === "Unlabeled" && s.label === "Unlabeled") {
      merged[merged.length - 1] = {
        ...last,
        endLine: s.endLine,
        content: `${last.content}\n${s.content}`.trim(),
        aliasCount: last.aliasCount + s.aliasCount,
        exportCount: last.exportCount + s.exportCount,
        evalCount: last.evalCount + s.evalCount,
        setoptCount: last.setoptCount + s.setoptCount,
        pluginCount: last.pluginCount + s.pluginCount,
        functionCount: last.functionCount + s.functionCount,
        sourceCount: last.sourceCount + s.sourceCount,
        autoloadCount: last.autoloadCount + s.autoloadCount,
        fpathCount: last.fpathCount + s.fpathCount,
        pathCount: last.pathCount + s.pathCount,
        themeCount: last.themeCount + s.themeCount,
        completionCount: last.completionCount + s.completionCount,
        historyCount: last.historyCount + s.historyCount,
        keybindingCount: last.keybindingCount + s.keybindingCount,
        otherCount: last.otherCount + s.otherCount,
      };
    } else {
      merged.push(s);
    }
  }
  return merged;
}
