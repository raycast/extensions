/**
 * Zsh configuration file parsing utilities
 *
 * Provides functions to parse zshrc files into structured sections,
 * detect aliases and exports, and categorize entries by type.
 */

import { PARSING_CONSTANTS } from "../constants";
import { countAllPatterns } from "./pattern-registry";
import { detectSectionMarker, updateSectionContext, type SectionContext } from "./section-detector";

import { EntryType } from "../types/enums";

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

/**
 * Represents an alias entry in zshrc
 */
export interface AliasEntry extends BaseEntry {
  readonly type: EntryType.ALIAS;
  /** The alias name */
  readonly name: string;
  /** The command the alias points to */
  readonly command: string;
}

/**
 * Represents an export entry in zshrc
 */
export interface ExportEntry extends BaseEntry {
  readonly type: EntryType.EXPORT;
  /** The environment variable name */
  readonly variable: string;
  /** The environment variable value */
  readonly value: string;
}

/**
 * Represents an eval entry in zshrc
 */
export interface EvalEntry extends BaseEntry {
  readonly type: EntryType.EVAL;
  /** The command to evaluate */
  readonly command: string;
}

/**
 * Represents a setopt entry in zshrc
 */
export interface SetoptEntry extends BaseEntry {
  readonly type: EntryType.SETOPT;
  /** The option name */
  readonly option: string;
}

/**
 * Represents a plugin entry in zshrc
 */
export interface PluginEntry extends BaseEntry {
  readonly type: EntryType.PLUGIN;
  /** The plugin name */
  readonly name: string;
}

/**
 * Represents a function entry in zshrc
 */
export interface FunctionEntry extends BaseEntry {
  readonly type: EntryType.FUNCTION;
  /** The function name */
  readonly name: string;
}

/**
 * Represents a source entry in zshrc
 */
export interface SourceEntry extends BaseEntry {
  readonly type: EntryType.SOURCE;
  /** The file path being sourced */
  readonly path: string;
}

/**
 * Represents an autoload entry in zshrc
 */
export interface AutoloadEntry extends BaseEntry {
  readonly type: EntryType.AUTOLOAD;
  /** The function to autoload */
  readonly function: string;
}

/**
 * Represents an fpath entry in zshrc
 */
export interface FpathEntry extends BaseEntry {
  readonly type: EntryType.FPATH;
  /** The fpath directories */
  readonly directories: string[];
}

/**
 * Represents a PATH entry in zshrc
 */
export interface PathEntry extends BaseEntry {
  readonly type: EntryType.PATH;
  /** The PATH value */
  readonly value: string;
}

/**
 * Represents a theme entry in zshrc
 */
export interface ThemeEntry extends BaseEntry {
  readonly type: EntryType.THEME;
  /** The theme name */
  readonly name: string;
}

/**
 * Represents a completion entry in zshrc
 */
export interface CompletionEntry extends BaseEntry {
  readonly type: EntryType.COMPLETION;
  /** The completion command */
  readonly command: string;
}

/**
 * Represents a history entry in zshrc
 */
export interface HistoryEntry extends BaseEntry {
  readonly type: EntryType.HISTORY;
  /** The history variable name */
  readonly variable: string;
  /** The history value */
  readonly value: string;
}

/**
 * Represents a keybinding entry in zshrc
 */
export interface KeybindingEntry extends BaseEntry {
  readonly type: EntryType.KEYBINDING;
  /** The keybinding command */
  readonly command: string;
}

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
 * Creates a base entry with common fields
 */
function createBaseEntry(
  type: EntryType,
  lineNumber: number,
  rawLine: string,
  sectionLabel: string | undefined,
): Record<string, unknown> {
  return {
    type,
    lineNumber,
    originalLine: rawLine,
    sectionLabel,
  };
}

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
 * Supports two section formats:
 * 1) "# Section: Name" (case-insensitive)
 * 2) "# --- Name --- #" (ignore lines like "# --- End ... --- #")
 *
 * @param content The raw zshrc file content
 * @returns Array of parsed entries with metadata
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
        const baseEntry = createBaseEntry(parser.type, index + 1, rawLine, context.currentSection);
        const specificData = parser.extract(match, rawLine);

        // Handle multi-entry types (plugins, fpath)
        if (parser.multiEntry && parser.type === EntryType.PLUGIN && match[1]) {
          const pluginList = match[1].split(/\s+/).filter((p) => p.trim());
          pluginList.forEach((plugin) => {
            entries.push({
              ...baseEntry,
              name: plugin.trim(),
            } as unknown as ZshEntry);
          });
        } else if (parser.multiEntry && parser.type === EntryType.FPATH && match[1]) {
          const directories = match[1].split(/\s+/).filter((d) => d.trim());
          directories.forEach((dir) => {
            entries.push({
              ...baseEntry,
              directories: [dir.trim()],
            } as unknown as ZshEntry);
          });
        } else {
          entries.push({ ...baseEntry, ...specificData } as unknown as ZshEntry);
        }

        matched = true;
        break;
      }
    }

    // If no parser matched, add as OTHER
    if (!matched) {
      entries.push({
        type: EntryType.OTHER,
        lineNumber: index + 1,
        originalLine: rawLine,
        sectionLabel: context.currentSection,
      });
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
        continue;
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
