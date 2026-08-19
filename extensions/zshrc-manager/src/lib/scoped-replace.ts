/**
 * Section-scoped, fail-closed replacement.
 *
 * Edit and delete locate a definition with a name-only pattern; when the
 * same name is defined more than once, replacing the first match in the
 * whole file modifies the wrong definition. Replacement therefore targets
 * the item's section instance and, within it, the single definition the
 * display parser recognizes — and FAILS CLOSED when the target cannot be
 * resolved unambiguously. Refusing with a reason is safer than silently
 * editing a guess in the user's shell config.
 *
 * The `matchesLine` predicate is derived from the same parser that rendered
 * the item in the UI, so a line the user never saw (an unquoted alias, an
 * empty export) can never be selected as the write target.
 */

import { detectSectionMarker } from "./section-detector";
import { multilineArrayInteriorLines } from "./pattern-registry";

interface SectionBounds {
  startLine: number;
  endLine: number;
}

const START_MARKERS = ["custom_start", "dashed_start", "bracketed", "hash", "labeled", "function_start"];
const END_MARKERS = ["custom_end", "dashed_end", "function_end"];

/**
 * Resolves the nth (0-based) section carrying `label`, using the same
 * boundary semantics as the parser (`toLogicalSections`): every start
 * marker begins a new section — including one repeating the same label —
 * and content excludes the marker lines. `findSectionBounds` cannot be
 * used here: it runs consecutive same-labeled regions together, so it
 * disagrees with the sections the items were parsed from.
 */
function findSectionInstanceBounds(content: string, label: string, n: number): SectionBounds | null {
  const lines = content.split(/\r?\n/);
  let instance = -1;
  let currentLabel: string | undefined;
  let currentStart = 1;

  const finish = (endLine: number): SectionBounds | null => {
    if (currentLabel === label && endLine >= currentStart) {
      instance += 1;
      if (instance === n) {
        return { startLine: currentStart, endLine };
      }
    }
    return null;
  };

  // Lines inside a multi-line array are never markers — must mirror
  // toLogicalSections, or write-target sections would resolve to
  // different bounds than the sections the items were parsed from.
  const arrayInterior = multilineArrayInteriorLines(content);

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw) continue;
    if (arrayInterior.has(i + 1)) continue;
    const marker = detectSectionMarker(raw, i + 1);
    if (!marker) continue;

    if (END_MARKERS.includes(marker.type)) {
      const resolved = finish(i);
      if (resolved) return resolved;
      currentLabel = undefined;
      currentStart = i + 2;
    } else if (START_MARKERS.includes(marker.type)) {
      const resolved = finish(i);
      if (resolved) return resolved;
      currentLabel = marker.name;
      currentStart = i + 2;
    }
  }

  return finish(lines.length);
}

/** Why a scoped replacement did not happen */
export type ScopedReplaceFailure = "not-found" | "ambiguous" | "unsupported";

export interface ScopedReplaceResult {
  /** Content after the replacement (unchanged when `found` is false) */
  content: string;
  /** Whether exactly one unambiguous target was replaced */
  found: boolean;
  /** Set when `found` is false: no match, several candidates, or a line the write pattern cannot handle */
  reason?: ScopedReplaceFailure;
}

/** A line-level predicate: does this line hold a definition the UI displayed? */
export type LineMatcher = (line: string) => boolean;

/**
 * Applies `pattern` to the single line at `index`. Deleting a line (the
 * replacer returns an empty string) removes it entirely rather than leaving
 * a blank. Returns null when the write pattern cannot parse the line.
 */
function applyToLine(
  lines: readonly string[],
  index: number,
  pattern: RegExp,
  replacer: (match: string) => string,
  eol: string,
): string | null {
  const single = new RegExp(pattern.source, pattern.flags.replace("g", ""));
  const line = lines[index] ?? "";
  if (!single.test(line)) {
    return null;
  }
  const replaced = line.replace(single, replacer);
  const out = [...lines];
  if (replaced === "" && line !== "") {
    out.splice(index, 1);
  } else {
    out[index] = replaced;
  }
  return out.join(eol);
}

/**
 * Replaces the definition of one item, resolved in this order:
 *
 * 1. Inside the item's own section instance (labels are not unique, so the
 *    specific same-labeled instance is resolved): act when the section holds
 *    exactly one line the display parser recognizes; refuse as ambiguous
 *    when it holds several — with no way to tell which one was selected,
 *    guessing risks editing the wrong definition.
 * 2. If the section cannot be resolved or holds no visible definition
 *    (unlabeled blocks, undetectable labels, a vanished instance): act only
 *    when the whole file holds exactly one visible definition.
 * 3. Without a section label (legacy paths), the first visible definition
 *    in the file is used, matching the extension's previous behavior.
 *
 * A refusal never modifies content — the caller surfaces the reason.
 */
export function replaceFirstScoped(
  content: string,
  sectionLabel: string | undefined,
  pattern: RegExp,
  replacer: (match: string) => string,
  matchesLine: LineMatcher,
  sectionOccurrence = 0,
): ScopedReplaceResult {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);

  const resolve = (index: number): ScopedReplaceResult => {
    const replaced = applyToLine(lines, index, pattern, replacer, eol);
    return replaced === null ? { content, found: false, reason: "unsupported" } : { content: replaced, found: true };
  };

  if (sectionLabel) {
    const bounds = findSectionInstanceBounds(content, sectionLabel, sectionOccurrence);
    if (bounds) {
      const inSection: number[] = [];
      for (let i = bounds.startLine - 1; i < bounds.endLine; i += 1) {
        if (matchesLine(lines[i] ?? "")) inSection.push(i);
      }
      if (inSection.length === 1) {
        return resolve(inSection[0]!);
      }
      if (inSection.length > 1) {
        // Several visible definitions and no way to tell which one was selected
        return { content, found: false, reason: "ambiguous" };
      }
      // None visible inside the resolved section — fall through to the
      // whole-file uniqueness check below
    }

    const inFile = lines.flatMap((line, i) => (matchesLine(line) ? [i] : []));
    if (inFile.length === 0) {
      return { content, found: false, reason: "not-found" };
    }
    if (inFile.length > 1) {
      return { content, found: false, reason: "ambiguous" };
    }
    return resolve(inFile[0]!);
  }

  const first = lines.findIndex((line) => matchesLine(line));
  if (first === -1) {
    return { content, found: false, reason: "not-found" };
  }
  return resolve(first);
}
