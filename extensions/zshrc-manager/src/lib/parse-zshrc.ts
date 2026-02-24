/**
 * Zsh configuration file parsing utilities
 *
 * Provides functions to parse zshrc files into structured sections,
 * detect aliases and exports, and categorize entries by type.
 */

import { PARSING_CONSTANTS, FILE_CONSTANTS } from "../constants";
import { countAllPatterns } from "./pattern-registry";
import { detectSectionMarker, updateSectionContext, type SectionContext } from "./section-detector";

import { EntryType } from "../types/enums";

/**
 * Maximum line length to process with regex.
 * Lines longer than this are skipped to prevent ReDoS attacks.
 */
const MAX_SAFE_LINE_LENGTH = FILE_CONSTANTS.MAX_LINE_LENGTH;

/**
 * Strategy for parsing an entry type
 */
interface EntryParserStrategy {
  /** Pattern to match */
  pattern: RegExp;
  /** Entry type */
  type: EntryType;
  /** Extract entry-specific data from match */
  extract: (match: RegExpMatchArray, rawLine: string) => Record<string, unknown>;
  /** Validate that match has required groups */
  validate: (match: RegExpMatchArray) => boolean;
  /** Whether this can produce multiple entries from one line */
  multiEntry?: boolean;
}

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
  readonly type: EntryType.ALIAS;
  readonly name: string;
  readonly command: string;
}

/** Export: variable + value */
export type ExportEntry = VariableValueEntry<EntryType.EXPORT>;

/** Eval: command */
export type EvalEntry = CommandEntry<EntryType.EVAL>;

/** Setopt: option */
export interface SetoptEntry extends BaseEntry {
  readonly type: EntryType.SETOPT;
  readonly option: string;
}

/** Plugin: name */
export type PluginEntry = NamedEntry<EntryType.PLUGIN>;

/** Function: name */
export type FunctionEntry = NamedEntry<EntryType.FUNCTION>;

/** Source: path */
export interface SourceEntry extends BaseEntry {
  readonly type: EntryType.SOURCE;
  readonly path: string;
}

/** Autoload: function name */
export interface AutoloadEntry extends BaseEntry {
  readonly type: EntryType.AUTOLOAD;
  readonly function: string;
}

/** Fpath: directories array */
export interface FpathEntry extends BaseEntry {
  readonly type: EntryType.FPATH;
  readonly directories: string[];
}

/** Path: value */
export interface PathEntry extends BaseEntry {
  readonly type: EntryType.PATH;
  readonly value: string;
}

/** Theme: name */
export type ThemeEntry = NamedEntry<EntryType.THEME>;

/** Completion: command */
export type CompletionEntry = CommandEntry<EntryType.COMPLETION>;

/** History config: variable + value */
export type HistoryEntry = VariableValueEntry<EntryType.HISTORY>;

/** Keybinding: command */
export type KeybindingEntry = CommandEntry<EntryType.KEYBINDING>;

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
 * Defines all entry parsing strategies
 */
const ENTRY_PARSERS: EntryParserStrategy[] = [
  {
    pattern: PARSING_CONSTANTS.PATTERNS.ALIAS,
    type: EntryType.ALIAS,
    validate: (match) => Boolean(match[1] && match[2]),
    extract: (match) => ({ name: match[1], command: match[2] }),
  },
  {
    pattern: PARSING_CONSTANTS.PATTERNS.EXPORT,
    type: EntryType.EXPORT,
    validate: (match) => Boolean(match[1] && match[2]),
    extract: (match) => ({ variable: match[1], value: match[2] }),
  },
  {
    pattern: PARSING_CONSTANTS.PATTERNS.EVAL,
    type: EntryType.EVAL,
    validate: (match) => Boolean(match[1]),
    extract: (match) => ({ command: match[1] }),
  },
  {
    pattern: PARSING_CONSTANTS.PATTERNS.SETOPT,
    type: EntryType.SETOPT,
    validate: (match) => Boolean(match[1]),
    extract: (match) => ({ option: match[1] }),
  },
  {
    pattern: PARSING_CONSTANTS.PATTERNS.PLUGIN,
    type: EntryType.PLUGIN,
    validate: (match) => Boolean(match[1]),
    extract: (match) => ({ name: match[1] }),
    multiEntry: true,
  },
  {
    pattern: PARSING_CONSTANTS.PATTERNS.FUNCTION,
    type: EntryType.FUNCTION,
    validate: (match) => Boolean(match[1]),
    extract: (match) => ({ name: match[1] }),
  },
  {
    pattern: PARSING_CONSTANTS.PATTERNS.SOURCE,
    type: EntryType.SOURCE,
    validate: (match) => Boolean(match[1]),
    extract: (match) => ({ path: match[1] }),
  },
  {
    pattern: PARSING_CONSTANTS.PATTERNS.AUTOLOAD,
    type: EntryType.AUTOLOAD,
    validate: (match) => Boolean(match[1]),
    extract: (match) => ({ function: match[1] }),
  },
  {
    pattern: PARSING_CONSTANTS.PATTERNS.FPATH,
    type: EntryType.FPATH,
    validate: (match) => Boolean(match[1]),
    extract: (match) => ({ directories: [match[1]] }),
    multiEntry: true,
  },
  {
    pattern: PARSING_CONSTANTS.PATTERNS.PATH,
    type: EntryType.PATH,
    validate: (match) => Boolean(match[1]),
    extract: (match) => ({ value: match[1] }),
  },
  {
    pattern: PARSING_CONSTANTS.PATTERNS.THEME,
    type: EntryType.THEME,
    validate: (match) => Boolean(match[1]),
    extract: (match) => ({ name: match[1] }),
  },
  {
    pattern: PARSING_CONSTANTS.PATTERNS.COMPLETION,
    type: EntryType.COMPLETION,
    validate: () => true,
    extract: () => ({ command: "compinit" }),
  },
  {
    pattern: PARSING_CONSTANTS.PATTERNS.HISTORY,
    type: EntryType.HISTORY,
    validate: (match) => Boolean(match[1]),
    extract: (match, rawLine) => {
      const variable = rawLine.match(/^(?:\s*)(HIST[A-Z_]*)\s*=/)?.[1] || "HIST";
      return { variable, value: match[1] };
    },
  },
  {
    pattern: PARSING_CONSTANTS.PATTERNS.KEYBINDING,
    type: EntryType.KEYBINDING,
    validate: (match) => Boolean(match[1]),
    extract: (match) => ({ command: match[1] }),
  },
];

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

    // Check for section markers using enhanced detection
    const marker = detectSectionMarker(rawLine, index + 1);
    if (marker) {
      context = updateSectionContext(marker, context);
      continue;
    }

    // Try each parser strategy in order
    let matched = false;
    for (const parser of ENTRY_PARSERS) {
      const match = rawLine.match(parser.pattern);
      if (match && parser.validate(match)) {
        const baseData = createBaseEntryData(index + 1, rawLine, context.currentSection);
        const specificData = parser.extract(match, rawLine);

        // Handle multi-entry types (plugins, fpath) with type-safe factories
        if (parser.multiEntry && parser.type === EntryType.PLUGIN && match[1]) {
          const pluginList = match[1].split(/\s+/).filter((p) => p.trim());
          for (const plugin of pluginList) {
            entries.push(entryFactories[EntryType.PLUGIN](baseData, { name: plugin.trim() }));
          }
        } else if (parser.multiEntry && parser.type === EntryType.FPATH && match[1]) {
          const directories = match[1].split(/\s+/).filter((d) => d.trim());
          for (const dir of directories) {
            entries.push(entryFactories[EntryType.FPATH](baseData, { directories: [dir.trim()] }));
          }
        } else {
          // Use type-safe factory based on entry type
          const factory = entryFactories[parser.type];
          if (factory) {
            entries.push(factory(baseData, specificData as never));
          }
        }

        matched = true;
        break;
      }
    }

    // If no parser matched, add as OTHER using type-safe factory
    if (!matched) {
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

    // Count other entries (non-empty lines that don't match any pattern)
    const allPatternMatches =
      counts.aliases +
      counts.exports +
      counts.evals +
      counts.setopts +
      counts.plugins +
      counts.functions +
      counts.sources +
      counts.autoloads +
      counts.fpaths +
      counts.paths +
      counts.themes +
      counts.completions +
      counts.history +
      counts.keybindings;
    const totalNonEmptyLines = joined.split("\n").filter((line) => line.trim().length > 0).length;
    const otherCount = Math.max(0, totalNonEmptyLines - allPatternMatches);

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

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw) continue;

    // Use enhanced section detection
    const marker = detectSectionMarker(raw, index + 1);
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
