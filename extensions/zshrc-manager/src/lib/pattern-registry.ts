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
 * Index just past the `)` matching the `$(` at `start`, or -1 when the
 * substitution never closes in `text`. The substitution gets its own
 * quote context (starting unquoted after `$(`): inner quotes never leak
 * into the caller's quote state, and a `)` inside inner quotes is
 * content, not the close. `$(` nests, both bare and inside inner double
 * quotes.
 */
function scanSubstitution(text: string, start: number): number {
  let depth = 1;
  let quote: '"' | "'" | null = null;
  for (let i = start + 2; i < text.length; i += 1) {
    const ch = text[i]!;
    if (quote === "'") {
      if (ch === "'") quote = null;
      continue;
    }
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "$" && text[i + 1] === "(") {
      depth += 1;
      i += 1;
      continue;
    }
    if (quote === '"') {
      if (ch === '"') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/**
 * Tokenizes zsh array body lines into elements, honoring the pieces of
 * zsh syntax that whitespace-splitting gets wrong: inline comments
 * (`#` at start of word) end the line, quoted elements may contain
 * whitespace, and backslashes escape. Quotes are stripped from the
 * returned elements — except inside `$(…)`, whose text (quotes and all)
 * is the declaration and is kept verbatim.
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
      if (quote === "'") {
        // Inside single quotes nothing escapes, not even backslash.
        if (ch === "'") {
          quote = null;
        } else {
          current += ch;
        }
        continue;
      }
      if (ch === "$" && line[i + 1] === "(") {
        // `$(…)` is one word however many spaces the command inside it
        // has, and its text is kept verbatim — inner quotes are part of
        // the declaration, and never leak into the outer quote state.
        // Applies inside double quotes too.
        const end = scanSubstitution(line, i);
        if (end === -1) {
          // Unclosed on this line: everything after is inside it.
          current += line.slice(i);
          break;
        }
        current += line.slice(i, end);
        i = end - 1;
        continue;
      }
      if (quote === '"') {
        if (ch === "\\") {
          const next = line[i + 1];
          // Inside double quotes a backslash escapes only these; before
          // anything else it stays a literal backslash.
          if (next === '"' || next === "\\" || next === "$" || next === "`") {
            current += next;
            i += 1;
          } else {
            current += ch;
          }
        } else if (ch === '"') {
          quote = null;
        } else {
          current += ch;
        }
        continue;
      }
      if (ch === "\\") {
        const next = line[i + 1];
        if (next !== undefined) {
          current += next;
          i += 1;
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
 * Index of the first `)` that actually closes an array — i.e. is not
 * inside quotes, not backslash-escaped, and not the close of a `$(…)`
 * command substitution (`path+=($(brew --prefix)/bin)`) — or -1. Shares
 * its quote and escape semantics with `tokenizeArrayBody`, so
 * termination and tokenization can never disagree about what a quote
 * covers.
 */
function findUnquotedCloseParen(text: string): number {
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (quote === "'") {
      if (ch === "'") quote = null;
      continue;
    }
    if (ch === "\\") {
      // Skipping the escaped char is right in both remaining states: it
      // only changes scanning when it hides a quote or a `)`.
      i += 1;
      continue;
    }
    if (ch === "$" && text[i + 1] === "(") {
      // `$(…)` is skipped as a unit with its own quote context (see
      // scanSubstitution) — inner quotes and parens are its content.
      const end = scanSubstitution(text, i);
      if (end === -1) return -1;
      i = end - 1;
      continue;
    }
    if (quote === '"') {
      if (ch === '"') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ")") return i;
  }
  return -1;
}

/**
 * Scalar PATH/FPATH declaration forms. Each variable ("PATH", "FPATH")
 * gets the same family of matchers. Order matters: the first matching
 * form wins for a given line. Array forms (`path=(…)`, `fpath+=(…)`) are
 * handled by the quote-aware array scanner in `extractDetailed`, which
 * runs before this and consumes those lines.
 */
function matchPathLike(line: string, upper: string): PathLikeMatch[] | null {
  const out = (entry: string, type: PathLikeMatch["type"]): PathLikeMatch[] => [{ entry, type, line: 0 }];

  let m = line.match(
    new RegExp(
      `^(?:\\s*)(?:export|(?:typeset|declare)(?:\\s+-[A-Za-z]+)*)\\s+${upper}\\s*=\\s*["']?(.+?)["']?(?:\\s*)$`,
    ),
  );
  if (m?.[1]) return out(m[1], "export");

  m = line.match(new RegExp(`^(?:\\s*)${upper}\\+=\\s*["']?:?(.+?)["']?(?:\\s*)$`));
  if (m?.[1] && !m[1].startsWith("(")) return out(m[1], "append");

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

/** A recognized array declaration and the physical lines it spans. */
interface ArrayScan {
  /** "plugins" | "path" | "fpath" */
  variable: string;
  /** `+=` (append) vs `=` (set) */
  append: boolean;
  /** Raw body text between the parens, one entry per physical line */
  parts: string[];
  /** 0-based index of the line holding the closing paren */
  closeIndex: number;
}

/**
 * Matches an array declaration (`plugins=(git docker)`, `path+=(`, …)
 * opening at `index` — single-line or spanning several lines as is
 * common in Oh My Zsh configs. Close-paren detection is quote-aware, so
 * a `)` inside a quoted element does not terminate the array. Returns
 * null when the line opens no array or the array never closes.
 */
function matchArrayAt(lines: readonly string[], index: number): ArrayScan | null {
  const raw = lines[index] ?? "";
  const arrayOpen = raw.match(/^(\s*)(plugins|path|fpath)(\+?)=\s*\((.*)$/);
  if (!arrayOpen) return null;

  const firstBody = arrayOpen[4] ?? "";
  const parts: string[] = [];
  let closeIndex = -1;

  const sameLineClose = findUnquotedCloseParen(firstBody);
  if (sameLineClose !== -1) {
    // Single line — only when nothing but whitespace or a comment
    // follows the close.
    const trailing = firstBody.slice(sameLineClose + 1).trim();
    if (trailing === "" || trailing.startsWith("#")) {
      parts.push(firstBody.slice(0, sameLineClose));
      closeIndex = index;
    }
  } else {
    parts.push(firstBody);
    let scan = index + 1;
    while (scan < lines.length) {
      const bodyLine = lines[scan] ?? "";
      const closePos = findUnquotedCloseParen(bodyLine);
      if (closePos !== -1) {
        parts.push(bodyLine.slice(0, closePos));
        closeIndex = scan;
        break;
      }
      parts.push(bodyLine);
      scan += 1;
    }
  }

  if (closeIndex === -1) return null;
  return { variable: arrayOpen[2]!, append: arrayOpen[3] === "+", parts, closeIndex };
}

/**
 * 1-based numbers of the body and closing lines of every multi-line
 * array. Section detection must ignore these lines: a comment inside an
 * array that happens to match a section-header format must not split
 * the array, or per-section counts would disagree with what the
 * registry (and therefore every view) extracts.
 */
export function multilineArrayInteriorLines(content: string): Set<number> {
  const interior = new Set<number>();
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw || raw.trim().length === 0) continue;
    if (raw.length > FILE_CONSTANTS.MAX_LINE_LENGTH) continue;
    const scan = matchArrayAt(lines, index);
    if (scan && scan.closeIndex > index) {
      for (let consumed = index + 1; consumed <= scan.closeIndex; consumed += 1) {
        interior.add(consumed + 1);
      }
      index = scan.closeIndex;
    }
  }
  return interior;
}

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

    // Array declarations — consumed as one declaration attributed to
    // their opening line (see `matchArrayAt`).
    const arrayScan = matchArrayAt(lines, index);
    if (arrayScan) {
      const elements = tokenizeArrayBody(arrayScan.parts);
      const type: PathLikeMatch["type"] = arrayScan.append ? "append" : "set";
      for (let consumed = index; consumed <= arrayScan.closeIndex; consumed += 1) {
        matchedLines.add(consumed + 1);
      }
      for (const element of elements) {
        if (arrayScan.variable === "plugins") {
          result.plugins.push({ name: element.trim(), line });
        } else if (arrayScan.variable === "path") {
          result.pathEntries.push({ entry: element.trim(), type, line });
        } else {
          result.fpathEntries.push({ entry: element.trim(), type, line });
        }
      }
      index = arrayScan.closeIndex;
      continue;
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

    const pathMatches = matchPathLike(raw, "PATH");
    if (pathMatches) {
      result.pathEntries.push(...withLine(pathMatches, line));
    }
    const fpathMatches = matchPathLike(raw, "FPATH");
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
