/**
 * Simple diff utility for showing changes before writes
 *
 * Since Raycast doesn't have a native diff component,
 * this generates markdown-formatted diff output.
 */

/**
 * Represents a line change in the diff
 */
interface DiffLine {
  type: "add" | "remove" | "unchanged";
  content: string;
  lineNumber?: number;
}

/**
 * Result of a diff operation
 */
export interface DiffResult {
  /** Whether there are any changes */
  hasChanges: boolean;
  /** Number of lines added */
  additions: number;
  /** Number of lines removed */
  deletions: number;
  /** The diff lines */
  lines: DiffLine[];
  /** Markdown representation of the diff */
  markdown: string;
}

/**
 * Computes a simple line-by-line diff between two strings
 *
 * @param original Original content
 * @param modified Modified content
 * @param contextLines Number of context lines to show around changes (default: 3)
 * @returns DiffResult with changes
 */
export function computeDiff(original: string, modified: string, contextLines = 3): DiffResult {
  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");

  // Simple positional diff (not LCS-based, but handles duplicates correctly)
  const diff = simpleDiff(originalLines, modifiedLines);

  // Generate markdown
  const markdown = generateDiffMarkdown(diff, contextLines);

  return {
    hasChanges: diff.additions > 0 || diff.deletions > 0,
    additions: diff.additions,
    deletions: diff.deletions,
    lines: diff.lines,
    markdown,
  };
}

/**
 * Simple positional diff algorithm.
 * Uses a greedy approach to find matching lines, handling duplicates correctly
 * by comparing positions rather than using Sets.
 */
function simpleDiff(
  original: string[],
  modified: string[],
): { lines: DiffLine[]; additions: number; deletions: number } {
  const lines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;

  // Build the diff output using positional comparison
  let origIdx = 0;
  let modIdx = 0;

  while (origIdx < original.length || modIdx < modified.length) {
    const origLine = original[origIdx];
    const modLine = modified[modIdx];

    if (origIdx >= original.length) {
      // Only modified lines left - all are additions
      lines.push({ type: "add", content: modLine || "", lineNumber: modIdx + 1 });
      additions++;
      modIdx++;
    } else if (modIdx >= modified.length) {
      // Only original lines left - all are deletions
      lines.push({ type: "remove", content: origLine || "" });
      deletions++;
      origIdx++;
    } else if (origLine === modLine) {
      // Lines match at current position
      lines.push({ type: "unchanged", content: origLine || "", lineNumber: modIdx + 1 });
      origIdx++;
      modIdx++;
    } else {
      // Lines differ - look ahead to find best match
      // Check if original line appears later in modified (it was moved/delayed)
      const origInModified = modified.indexOf(origLine || "", modIdx);
      // Check if modified line appears later in original (it was inserted)
      const modInOriginal = original.indexOf(modLine || "", origIdx);

      if (modInOriginal === -1 && origInModified === -1) {
        // Neither line appears later - treat as replacement
        lines.push({ type: "remove", content: origLine || "" });
        deletions++;
        lines.push({ type: "add", content: modLine || "", lineNumber: modIdx + 1 });
        additions++;
        origIdx++;
        modIdx++;
      } else if (
        origInModified === -1 ||
        (modInOriginal !== -1 && modInOriginal - origIdx <= origInModified - modIdx)
      ) {
        // Original line doesn't appear later, or modified line is closer - this is a deletion
        lines.push({ type: "remove", content: origLine || "" });
        deletions++;
        origIdx++;
      } else {
        // Modified line doesn't appear later, or original is closer - this is an addition
        lines.push({ type: "add", content: modLine || "", lineNumber: modIdx + 1 });
        additions++;
        modIdx++;
      }
    }
  }

  return { lines, additions, deletions };
}

/**
 * Generates markdown representation of the diff
 */
function generateDiffMarkdown(
  diff: { lines: DiffLine[]; additions: number; deletions: number },
  contextLines: number,
): string {
  const { lines, additions, deletions } = diff;

  if (additions === 0 && deletions === 0) {
    return "No changes detected.";
  }

  const parts: string[] = [];
  parts.push(`## Changes Summary`);
  parts.push(`- **${additions}** addition${additions !== 1 ? "s" : ""}`);
  parts.push(`- **${deletions}** deletion${deletions !== 1 ? "s" : ""}`);
  parts.push("");
  parts.push("## Diff");
  parts.push("```diff");

  // Find changed regions and include context
  let inChangeRegion = false;
  let lastChangeIdx = -contextLines - 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const isChange = line.type !== "unchanged";

    if (isChange) {
      // Show context before change if we're starting a new region
      if (!inChangeRegion && i - lastChangeIdx > contextLines * 2) {
        // Add separator if there's a gap
        if (lastChangeIdx >= 0) {
          parts.push("...");
        }
        // Show preceding context
        for (let j = Math.max(0, i - contextLines); j < i; j++) {
          const ctxLine = lines[j];
          if (ctxLine && ctxLine.type === "unchanged") {
            parts.push(`  ${ctxLine.content}`);
          }
        }
      }

      inChangeRegion = true;
      lastChangeIdx = i;

      // Show the change
      const prefix = line.type === "add" ? "+" : "-";
      parts.push(`${prefix} ${line.content}`);
    } else if (inChangeRegion && i - lastChangeIdx <= contextLines) {
      // Show trailing context
      parts.push(`  ${line.content}`);
    } else {
      inChangeRegion = false;
    }
  }

  parts.push("```");

  return parts.join("\n");
}

/**
 * Generates a preview of what the file will look like after changes
 *
 * @param original Original content
 * @param modified Modified content
 * @param maxLines Maximum lines to show in preview
 * @returns Markdown preview
 */
export function generatePreview(original: string, modified: string, maxLines = 20): string {
  const diff = computeDiff(original, modified);

  if (!diff.hasChanges) {
    return "No changes to preview.";
  }

  const modifiedLines = modified.split("\n");
  const previewLines = modifiedLines.slice(0, maxLines);
  const hasMore = modifiedLines.length > maxLines;

  const parts: string[] = [];
  parts.push("## Preview");
  parts.push("```zsh");
  parts.push(...previewLines);
  if (hasMore) {
    parts.push(`... (${modifiedLines.length - maxLines} more lines)`);
  }
  parts.push("```");

  return parts.join("\n");
}

/**
 * Creates a combined diff and preview markdown
 */
export function createDiffPreview(original: string, modified: string): string {
  const diff = computeDiff(original, modified);
  const preview = generatePreview(original, modified);

  return `${diff.markdown}\n\n${preview}`;
}
