/**
 * Centralized pattern registry for zsh parsing — the single parser.
 *
 * Every surface (type views, statistics, sections, search) derives from
 * `matchLine` / `extractEntries` here, so counts, search results, and
 * drill-down views cannot disagree. `countAllPatterns` is a projection
 * over `extractEntries`, and the legacy `utils/parsers.ts` functions are
 * thin projections over the same output.
 *
 * Every extracted entry carries the 1-based line it was parsed from
 * (relative to the content handed in), so write paths can eventually
 * address definitions directly instead of counting occurrences.
 */

import { FILE_CONSTANTS, PARSING_CONSTANTS } from "../constants";

/** Position information every registry entry carries. */
interface Positioned {
  /** 1-based line number within the parsed content */
  line: number;
}

export interface AliasMatch extends Positioned {
  name: string;
  command: string;
}
export interface ExportMatch extends Positioned {
  variable: string;
  value: string;
}
export interface EvalMatch extends Positioned {
  command: string;
}
export interface SetoptMatch extends Positioned {
  option: string;
}
export interface PluginMatch extends Positioned {
  name: string;
}
export interface FunctionMatch extends Positioned {
  name: string;
}
export interface SourceMatch extends Positioned {
  path: string;
}
export interface AutoloadMatch extends Positioned {
  function: string;
}
export interface PathLikeMatch extends Positioned {
  entry: string;
  type: "export" | "append" | "prepend" | "set";
}
export interface ThemeMatch extends Positioned {
  name: string;
}
export interface CompletionMatch extends Positioned {
  command: string;
}
export interface HistoryMatch extends Positioned {
  variable: string;
  value: string;
}
export interface KeybindingMatch extends Positioned {
  key: string;
  command: string;
  widget?: string | undefined;
  keymap?: string | undefined;
}

/** Everything the registry extracted from one piece of content. */
export interface RegistryEntries {
  aliases: AliasMatch[];
  exports: ExportMatch[];
  evals: EvalMatch[];
  setopts: SetoptMatch[];
  plugins: PluginMatch[];
  functions: FunctionMatch[];
  sources: SourceMatch[];
  autoloads: AutoloadMatch[];
  fpathEntries: PathLikeMatch[];
  pathEntries: PathLikeMatch[];
  themes: ThemeMatch[];
  completions: CompletionMatch[];
  history: HistoryMatch[];
  keybindings: KeybindingMatch[];
}

const P = PARSING_CONSTANTS.PATTERNS;

/**
 * Tokenizes zsh array body lines into elements, honoring the two pieces
 * of zsh syntax that whitespace-splitting gets wrong: inline comments
 * (`#` at start of word) end the line, and quoted elements may contain
 * whitespace. Quotes are stripped from the returned elements.
 */
export function tokenizeArrayBody(bodyLines: string[]): string[] {
  const tokens: string[] = [];
  for (const line of bodyLines) {
    // Single pass tracking quote state: `#` starts a comment only when it
    // is outside quotes AND begins a word — a `#` inside quotes (or inside
    // a word like foo#bar) is content, not a comment.
    let current = "";
    let quote: '"' | "'" | null = null;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]!;
      if (quote) {
        if (ch === quote) {
          quote = null;
        } else {
          current += ch;
        }
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }
      if (ch === "#" && current === "") {
        // Comment runs to end of line
        break;
      }
      if (/\s/.test(ch)) {
        if (current) {
          tokens.push(current);
          current = "";
        }
        continue;
      }
      current += ch;
    }
    if (current) {
      tokens.push(current);
    }
  }
  return tokens;
}

/**
 * PATH/FPATH declaration forms. Each variable ("PATH"/"path",
 * "FPATH"/"fpath") gets the same family of matchers. Order matters:
 * the first matching form wins for a given line.
 */
function matchPathLike(line: string, upper: string, lower: string): PathLikeMatch[] | null {
  const out = (entry: string, type: PathLikeMatch["type"]): PathLikeMatch[] => [{ entry, type, line: 0 }];
  const split = (list: string, type: PathLikeMatch["type"]): PathLikeMatch[] =>
    tokenizeArrayBody([list]).map((entry) => ({ entry, type, line: 0 }));

  let m = line.match(
    new RegExp(
      `^(?:\\s*)(?:export|(?:typeset|declare)(?:\\s+-[A-Za-z]+)*)\\s+${upper}\\s*=\\s*["']?(.+?)["']?(?:\\s*)$`,
    ),
  );
  if (m?.[1]) return out(m[1], "export");

  m = line.match(new RegExp(`^(?:\\s*)${upper}\\+=\\s*["']?:?(.+?)["']?(?:\\s*)$`));
  if (m?.[1] && !m[1].startsWith("(")) return out(m[1], "append");

  m = line.match(new RegExp(`^(?:\\s*)${lower}\\+=\\s*\\(([^)]+)\\)(?:\\s*)$`));
  if (m?.[1]) return split(m[1], "append");

  m = line.match(new RegExp(`^(?:\\s*)${lower}=\\s*\\(([^)]+)\\)(?:\\s*)$`));
  if (m?.[1]) return split(m[1], "set");

  m = line.match(new RegExp(`^(?:\\s*)${upper}\\s*=\\s*["']?\\$${upper}:(.+?)["']?(?:\\s*)$`));
  if (m?.[1]) return out(m[1], "append");

  m = line.match(new RegExp(`^(?:\\s*)${upper}\\s*=\\s*["']?(.+?):\\$${upper}["']?(?:\\s*)$`));
  if (m?.[1]) return out(m[1], "prepend");

  // Plain assignment replaces the whole variable — a "set", like the
  // array form. (Deliberate unification decision: the count and the
  // view agree by both listing it.)
  m = line.match(new RegExp(`^(?:\\s*)${upper}\\s*=\\s*["']?(.+?)["']?(?:\\s*)$`));
  if (m?.[1] && !m[1].includes(`$${upper}`)) return out(m[1], "set");

  return null;
}

/**
 * Structured keybinding forms, ported from the legacy parser. Order
 * matters: the most specific form wins. Bare mode/flag lines
 * (`bindkey -e`, `bindkey -v`) deliberately do not match — the
 * keybindings view has nothing to show for them, and counts must agree
 * with the view.
 */
function matchKeybinding(line: string): KeybindingMatch | null {
  let m = line.match(/^(?:\s*)bindkey\s+-M\s+(\S+)\s+-s\s+(['"])([^'"]+)\2\s+(['"])([^'"]+)\4(?:\s*)$/);
  if (m?.[1] && m[3] && m[5]) {
    return { key: m[3], command: m[5].trim(), widget: "string-replacement", keymap: m[1], line: 0 };
  }
  m = line.match(/^(?:\s*)bindkey\s+-M\s+(\S+)\s+(['"])([^'"]+)\2\s+(\S+)(?:\s*)$/);
  if (m?.[1] && m[3] && m[4]) {
    return { key: m[3], command: m[4].trim(), keymap: m[1], line: 0 };
  }
  m = line.match(/^(?:\s*)bindkey\s+-M\s+(\S+)\s+([^'"\s]\S*)\s+(\S+)(?:\s*)$/);
  if (m?.[1] && m[2] && m[3]) {
    return { key: m[2], command: m[3].trim(), keymap: m[1], line: 0 };
  }
  m = line.match(/^(?:\s*)bindkey\s+-s\s+(['"])([^'"]+)\1\s+(['"])([^'"]+)\3(?:\s*)$/);
  if (m?.[2] && m[4]) {
    return { key: m[2], command: m[4].trim(), widget: "string-replacement", line: 0 };
  }
  m = line.match(/^(?:\s*)bindkey\s+(?!-[MsrRLlevaAdpN])(['"])([^'"]+)\1\s+(\S+)(?:\s*)$/);
  if (m?.[2] && m[3]) {
    return { key: m[2], command: m[3].trim(), line: 0 };
  }
  m = line.match(/^(?:\s*)bindkey\s+(?!-[MsrRLlevaAdpN])([^'"\s]\S*)\s+(\S+)(?:\s*)$/);
  if (m?.[1] && m[2]) {
    return { key: m[1], command: m[2].trim(), line: 0 };
  }
  return null;
}

const withLine = <T extends Positioned>(entries: T[] | null, line: number): T[] =>
  (entries ?? []).map((entry) => ({ ...entry, line }));

/** Registry extraction plus which physical lines it consumed. */
export interface DetailedExtraction {
  entries: RegistryEntries;
  /**
   * 1-based numbers of every non-empty line the registry recognized,
   * including the opening, body, and closing lines of multi-line arrays.
   * Lines outside this set are what "Other" counts should count.
   */
  matchedLines: Set<number>;
}

/**
 * Extract every recognized construct from content, with line positions.
 *
 * A line can legitimately surface in more than one collection —
 * `export PATH=…` is both an export and a PATH declaration, matching
 * what the Exports and PATH views have always shown.
 */
export function extractDetailed(content: string): DetailedExtraction {
  const matchedLines = new Set<number>();
  const result: RegistryEntries = {
    aliases: [],
    exports: [],
    evals: [],
    setopts: [],
    plugins: [],
    functions: [],
    sources: [],
    autoloads: [],
    fpathEntries: [],
    pathEntries: [],
    themes: [],
    completions: [],
    history: [],
    keybindings: [],
  };

  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw || raw.trim().length === 0) continue;
    // Skip extremely long lines to prevent ReDoS
    if (raw.length > FILE_CONSTANTS.MAX_LINE_LENGTH) continue;
    const line = index + 1;

    // Multi-line array declarations (`plugins=(`, `path+=(`, …) — common
    // in Oh My Zsh configs — are consumed as one declaration attributed
    // to their opening line.
    const arrayOpen = raw.match(/^(\s*)(plugins|path|fpath)(\+?)=\s*\(([^)]*)$/);
    if (arrayOpen && !raw.includes(")")) {
      const parts: string[] = [arrayOpen[4] ?? ""];
      let closeIndex = index + 1;
      while (closeIndex < lines.length) {
        const bodyLine = lines[closeIndex] ?? "";
        const closePos = bodyLine.indexOf(")");
        if (closePos !== -1) {
          parts.push(bodyLine.slice(0, closePos));
          break;
        }
        parts.push(bodyLine);
        closeIndex += 1;
      }
      if (closeIndex < lines.length) {
        const elements = tokenizeArrayBody(parts);
        const variable = arrayOpen[2]!;
        const type: PathLikeMatch["type"] = arrayOpen[3] === "+" ? "append" : "set";
        for (let consumed = index; consumed <= closeIndex; consumed += 1) {
          matchedLines.add(consumed + 1);
        }
        for (const element of elements) {
          if (variable === "plugins") {
            result.plugins.push({ name: element.trim(), line });
          } else if (variable === "path") {
            result.pathEntries.push({ entry: element.trim(), type, line });
          } else {
            result.fpathEntries.push({ entry: element.trim(), type, line });
          }
        }
        index = closeIndex;
        continue;
      }
    }

    let m = raw.match(P.ALIAS);
    if (m?.[1] && m[2]) {
      result.aliases.push({ name: m[1], command: m[2], line });
      continue;
    }

    // Exports and PATH/FPATH declarations are not exclusive: fall through.
    m = raw.match(P.EXPORT);
    if (m?.[1] && m[2]) {
      result.exports.push({ variable: m[1], value: m[2], line });
    }

    const pathMatches = matchPathLike(raw, "PATH", "path");
    if (pathMatches) {
      result.pathEntries.push(...withLine(pathMatches, line));
    }
    const fpathMatches = matchPathLike(raw, "FPATH", "fpath");
    if (fpathMatches) {
      result.fpathEntries.push(...withLine(fpathMatches, line));
    }
    if (m || pathMatches || fpathMatches) {
      continue;
    }

    m = raw.match(P.EVAL);
    if (m?.[1]) {
      result.evals.push({ command: m[1], line });
      continue;
    }

    m = raw.match(P.SETOPT);
    if (m?.[1]) {
      result.setopts.push({ option: m[1], line });
      continue;
    }

    m = raw.match(P.PLUGIN);
    if (m?.[1]) {
      for (const name of tokenizeArrayBody([m[1]])) {
        result.plugins.push({ name, line });
      }
      matchedLines.add(line);
      continue;
    }

    m = raw.match(P.FUNCTION);
    if (m?.[1]) {
      result.functions.push({ name: m[1], line });
      continue;
    }

    m = raw.match(P.SOURCE);
    if (m?.[1]) {
      result.sources.push({ path: m[1], line });
      continue;
    }

    m = raw.match(P.AUTOLOAD);
    if (m?.[1]) {
      result.autoloads.push({ function: m[1], line });
      continue;
    }

    m = raw.match(P.THEME);
    if (m?.[1]) {
      result.themes.push({ name: m[1], line });
      continue;
    }

    m = raw.match(P.COMPLETION);
    if (m) {
      result.completions.push({ command: "compinit", line });
      continue;
    }

    m = raw.match(P.HISTORY);
    if (m?.[1]) {
      const variable = raw.match(/^(?:\s*)(HIST[A-Z_]*)\s*=/)?.[1] || "HIST";
      result.history.push({ variable, value: m[1], line });
      continue;
    }

    const keybinding = matchKeybinding(raw);
    if (keybinding) {
      result.keybindings.push({ ...keybinding, line });
      continue;
    }
  }

  // Every entry's own line is a recognized line; multi-line array
  // body/close lines were added when they were consumed above.
  for (const collection of Object.values(result)) {
    for (const entry of collection) {
      matchedLines.add(entry.line);
    }
  }

  return { entries: result, matchedLines };
}

/** Extract every recognized construct from content, with line positions. */
export function extractEntries(content: string): RegistryEntries {
  return extractDetailed(content).entries;
}

/**
 * Counts non-empty lines the registry did not recognize — the "Other"
 * count. Lines are the unit here (unlike the per-entry type counts), so
 * a recognized multi-line array contributes nothing to Other, however
 * many elements or physical lines it spans.
 */
export function countUnrecognizedLines(content: string): number {
  const { matchedLines } = extractDetailed(content);
  const lines = content.split(/\r?\n/);
  let unrecognized = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw || raw.trim().length === 0) continue;
    if (!matchedLines.has(index + 1)) {
      unrecognized += 1;
    }
  }
  return unrecognized;
}

/**
 * Count all pattern matches in content.
 *
 * A projection over `extractEntries`, so any count shown anywhere equals
 * the number of entries the corresponding view lists.
 */
export function countAllPatterns(content: string) {
  const entries = extractEntries(content);
  return {
    aliases: entries.aliases.length,
    exports: entries.exports.length,
    evals: entries.evals.length,
    setopts: entries.setopts.length,
    plugins: entries.plugins.length,
    functions: entries.functions.length,
    sources: entries.sources.length,
    autoloads: entries.autoloads.length,
    fpaths: entries.fpathEntries.length,
    paths: entries.pathEntries.length,
    themes: entries.themes.length,
    completions: entries.completions.length,
    history: entries.history.length,
    keybindings: entries.keybindings.length,
  };
}
