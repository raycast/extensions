/**
 * Zsh configuration file parsing utilities
 *
 * Provides functions to parse zshrc files into structured sections,
 * detect aliases and exports, and categorize entries by type.
 */

import { PARSING_CONSTANTS } from "../constants";
import { countAllPatterns } from "./pattern-registry";
import {
  detectSectionMarker,
  updateSectionContext,
  type SectionContext,
} from "./section-detector";

import { EntryType } from "../types/enums";

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
  readonly type: "alias";
  /** The alias name */
  readonly name: string;
  /** The command the alias points to */
  readonly command: string;
}

/**
 * Represents an export entry in zshrc
 */
export interface ExportEntry extends BaseEntry {
  readonly type: "export";
  /** The environment variable name */
  readonly variable: string;
  /** The environment variable value */
  readonly value: string;
}

/**
 * Represents an eval entry in zshrc
 */
export interface EvalEntry extends BaseEntry {
  readonly type: "eval";
  /** The command to evaluate */
  readonly command: string;
}

/**
 * Represents a setopt entry in zshrc
 */
export interface SetoptEntry extends BaseEntry {
  readonly type: "setopt";
  /** The option name */
  readonly option: string;
}

/**
 * Represents a plugin entry in zshrc
 */
export interface PluginEntry extends BaseEntry {
  readonly type: "plugin";
  /** The plugin name */
  readonly name: string;
}

/**
 * Represents a function entry in zshrc
 */
export interface FunctionEntry extends BaseEntry {
  readonly type: "function";
  /** The function name */
  readonly name: string;
}

/**
 * Represents a source entry in zshrc
 */
export interface SourceEntry extends BaseEntry {
  readonly type: "source";
  /** The file path being sourced */
  readonly path: string;
}

/**
 * Represents an autoload entry in zshrc
 */
export interface AutoloadEntry extends BaseEntry {
  readonly type: "autoload";
  /** The function to autoload */
  readonly function: string;
}

/**
 * Represents an fpath entry in zshrc
 */
export interface FpathEntry extends BaseEntry {
  readonly type: "fpath";
  /** The fpath directories */
  readonly directories: string[];
}

/**
 * Represents a PATH entry in zshrc
 */
export interface PathEntry extends BaseEntry {
  readonly type: "path";
  /** The PATH value */
  readonly value: string;
}

/**
 * Represents a theme entry in zshrc
 */
export interface ThemeEntry extends BaseEntry {
  readonly type: "theme";
  /** The theme name */
  readonly name: string;
}

/**
 * Represents a completion entry in zshrc
 */
export interface CompletionEntry extends BaseEntry {
  readonly type: "completion";
  /** The completion command */
  readonly command: string;
}

/**
 * Represents a history entry in zshrc
 */
export interface HistoryEntry extends BaseEntry {
  readonly type: "history";
  /** The history variable name */
  readonly variable: string;
  /** The history value */
  readonly value: string;
}

/**
 * Represents a keybinding entry in zshrc
 */
export interface KeybindingEntry extends BaseEntry {
  readonly type: "keybinding";
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

    // Check for all entry types in priority order
    const aliasMatch = rawLine.match(PARSING_CONSTANTS.PATTERNS.ALIAS);
    if (aliasMatch && aliasMatch[1] && aliasMatch[2]) {
      const name = aliasMatch[1];
      const command = aliasMatch[2];
      entries.push({
        type: "alias",
        lineNumber: index + 1,
        originalLine: rawLine,
        sectionLabel: context.currentSection,
        name,
        command,
      });
      continue;
    }

    const exportMatch = rawLine.match(PARSING_CONSTANTS.PATTERNS.EXPORT);
    if (exportMatch && exportMatch[1] && exportMatch[2]) {
      const variable = exportMatch[1];
      const value = exportMatch[2];
      entries.push({
        type: "export",
        lineNumber: index + 1,
        originalLine: rawLine,
        sectionLabel: context.currentSection,
        variable,
        value,
      });
      continue;
    }

    const evalMatch = rawLine.match(PARSING_CONSTANTS.PATTERNS.EVAL);
    if (evalMatch && evalMatch[1]) {
      const command = evalMatch[1];
      entries.push({
        type: "eval",
        lineNumber: index + 1,
        originalLine: rawLine,
        sectionLabel: context.currentSection,
        command,
      });
      continue;
    }

    const setoptMatch = rawLine.match(PARSING_CONSTANTS.PATTERNS.SETOPT);
    if (setoptMatch && setoptMatch[1]) {
      const option = setoptMatch[1];
      entries.push({
        type: "setopt",
        lineNumber: index + 1,
        originalLine: rawLine,
        sectionLabel: context.currentSection,
        option,
      });
      continue;
    }

    const pluginMatch = rawLine.match(PARSING_CONSTANTS.PATTERNS.PLUGIN);
    if (pluginMatch && pluginMatch[1]) {
      const pluginList = pluginMatch[1].split(/\s+/).filter((p) => p.trim());
      pluginList.forEach((plugin) => {
        entries.push({
          type: "plugin",
          lineNumber: index + 1,
          originalLine: rawLine,
          sectionLabel: context.currentSection,
          name: plugin.trim(),
        });
      });
      continue;
    }

    const functionMatch = rawLine.match(PARSING_CONSTANTS.PATTERNS.FUNCTION);
    if (functionMatch && functionMatch[1]) {
      const name = functionMatch[1];
      entries.push({
        type: "function",
        lineNumber: index + 1,
        originalLine: rawLine,
        sectionLabel: context.currentSection,
        name,
      });
      continue;
    }

    const sourceMatch = rawLine.match(PARSING_CONSTANTS.PATTERNS.SOURCE);
    if (sourceMatch && sourceMatch[1]) {
      const path = sourceMatch[1];
      entries.push({
        type: "source",
        lineNumber: index + 1,
        originalLine: rawLine,
        sectionLabel: context.currentSection,
        path,
      });
      continue;
    }

    const autoloadMatch = rawLine.match(PARSING_CONSTANTS.PATTERNS.AUTOLOAD);
    if (autoloadMatch && autoloadMatch[1]) {
      const func = autoloadMatch[1];
      entries.push({
        type: "autoload",
        lineNumber: index + 1,
        originalLine: rawLine,
        sectionLabel: context.currentSection,
        function: func,
      });
      continue;
    }

    const fpathMatch = rawLine.match(PARSING_CONSTANTS.PATTERNS.FPATH);
    if (fpathMatch && fpathMatch[1]) {
      const directories = fpathMatch[1].split(/\s+/).filter((d) => d.trim());
      directories.forEach((dir) => {
        entries.push({
          type: "fpath",
          lineNumber: index + 1,
          originalLine: rawLine,
          sectionLabel: context.currentSection,
          directories: [dir.trim()],
        });
      });
      continue;
    }

    const pathMatch = rawLine.match(PARSING_CONSTANTS.PATTERNS.PATH);
    if (pathMatch && pathMatch[1]) {
      const value = pathMatch[1];
      entries.push({
        type: "path",
        lineNumber: index + 1,
        originalLine: rawLine,
        sectionLabel: context.currentSection,
        value,
      });
      continue;
    }

    const themeMatch = rawLine.match(PARSING_CONSTANTS.PATTERNS.THEME);
    if (themeMatch && themeMatch[1]) {
      const name = themeMatch[1];
      entries.push({
        type: "theme",
        lineNumber: index + 1,
        originalLine: rawLine,
        sectionLabel: context.currentSection,
        name,
      });
      continue;
    }

    const completionMatch = rawLine.match(
      PARSING_CONSTANTS.PATTERNS.COMPLETION,
    );
    if (completionMatch) {
      entries.push({
        type: "completion",
        lineNumber: index + 1,
        originalLine: rawLine,
        sectionLabel: context.currentSection,
        command: "compinit",
      });
      continue;
    }

    const historyMatch = rawLine.match(PARSING_CONSTANTS.PATTERNS.HISTORY);
    if (historyMatch && historyMatch[1]) {
      const variable =
        rawLine.match(/^(?:\s*)(HIST[A-Z_]*)\s*=/)?.[1] || "HIST";
      const value = historyMatch[1];
      entries.push({
        type: "history",
        lineNumber: index + 1,
        originalLine: rawLine,
        sectionLabel: context.currentSection,
        variable,
        value,
      });
      continue;
    }

    const keybindingMatch = rawLine.match(
      PARSING_CONSTANTS.PATTERNS.KEYBINDING,
    );
    if (keybindingMatch && keybindingMatch[1]) {
      const command = keybindingMatch[1];
      entries.push({
        type: "keybinding",
        lineNumber: index + 1,
        originalLine: rawLine,
        sectionLabel: context.currentSection,
        command,
      });
      continue;
    }

    entries.push({
      type: "other",
      lineNumber: index + 1,
      originalLine: rawLine,
      sectionLabel: context.currentSection,
    });
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
export function toLogicalSections(
  content: string,
): ReadonlyArray<LogicalSection> {
  const lines = content.split(/\r?\n/);
  const sections: LogicalSection[] = [];
  let currentLabel: string | undefined;
  let currentStart = 1;
  let context: SectionContext = {
    currentSection: undefined,
    sectionStack: [],
    functionLevel: 0,
  };

  const pushSection = (
    start: number,
    end: number,
    label: string | undefined,
  ) => {
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
    const totalNonEmptyLines = joined
      .split("\n")
      .filter((line) => line.trim().length > 0).length;
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
      if (
        [
          "custom_start",
          "dashed_start",
          "bracketed",
          "hash",
          "labeled",
          "function_start",
        ].includes(marker.type)
      ) {
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
