/**
 * Pure content computation for the edit/delete write path.
 *
 * Everything here is side-effect free: given the current file content and
 * the intended operation, produce the new content (or throw with a
 * user-facing message when the target cannot be resolved unambiguously).
 * The form, the delete flow, and the diff preview all derive from these
 * functions, so the preview always shows exactly what a save would write.
 */

import { findSectionBounds } from "./section-detector";
import { replaceFirstScoped, type ScopedReplaceFailure } from "./scoped-replace";

/**
 * Configuration for EditItemForm component
 */
export interface EditItemConfig {
  /** Label for the key field (e.g., "Alias Name" or "Variable Name") */
  keyLabel: string;
  /** Label for the value field (e.g., "Command" or "Value") */
  valueLabel: string;
  /** Placeholder for key field */
  keyPlaceholder: string;
  /** Placeholder for value field */
  valuePlaceholder: string;
  /** Validation regex for key field */
  keyPattern: RegExp;
  /** Validation error message for key field */
  keyValidationError: string;
  /** Function to generate the line to insert */
  generateLine: (key: string, value: string) => string;
  /** Function to generate regex pattern for finding existing item */
  generatePattern: (key: string) => RegExp;
  /** Function to generate replacement line for update */
  generateReplacement: (key: string, value: string) => string;
  /**
   * Whether a line holds a definition of `key` as the display parser sees it.
   * The write path only ever targets lines this predicate accepts, so it can
   * never rewrite a line the UI did not show.
   */
  matchesDisplayLine: (line: string, key: string) => boolean;
  /** Item type name for messages (e.g., "alias" or "export") */
  itemType: string;
  /** Item type capitalized for titles (e.g., "Alias" or "Export") */
  itemTypeCapitalized: string;
}

/** Error message for a scoped replacement that refused to guess */
export function scopedFailureMessage(
  reason: ScopedReplaceFailure | undefined,
  itemTypeCapitalized: string,
  key: string,
): string {
  switch (reason) {
    case "ambiguous":
      return `Multiple definitions of "${key}" exist and the selected one could not be identified — edit ~/.zshrc directly`;
    case "unsupported":
      return `The definition of "${key}" uses a format this extension cannot rewrite safely — edit ~/.zshrc directly`;
    default:
      return `${itemTypeCapitalized} "${key}" not found in zshrc`;
  }
}

/**
 * Replaces a matched definition line while preserving its leading whitespace
 * and inline comment (pattern groups 1 and 3)
 */
export function preservingReplacer(pattern: RegExp, replacement: string): (matchedLine: string) => string {
  return (matchedLine) => {
    const single = new RegExp(pattern.source, pattern.flags.replace("g", ""));
    const match = single.exec(matchedLine);
    const leadingWhitespace = match?.[1] ?? "";
    const comment = match?.[3] ?? "";
    return `${leadingWhitespace}${replacement.trimStart()}${comment}`;
  };
}

/**
 * Inserts a line at the end of a named section (after its last non-empty
 * line). When the section does not exist, it is created at the end of the
 * file. The section dropdown offers labels, not instances, so when the
 * target label is duplicated the first instance receives the line by design.
 */
export function insertIntoSection(content: string, targetSection: string, itemLine: string): string {
  const bounds = findSectionBounds(content, targetSection);
  if (!bounds) {
    return `${content}\n\n# --- ${targetSection} --- #\n${itemLine}`;
  }

  const lines = content.split(/\r?\n/);
  let insertLineIndex = bounds.endLine - 1;
  for (let i = bounds.endLine - 1; i >= bounds.startLine - 1; i--) {
    const line = lines[i];
    if (line && line.trim().length > 0) {
      insertLineIndex = i;
      break;
    }
  }

  const before = lines.slice(0, insertLineIndex + 1).join("\n");
  const after = lines.slice(insertLineIndex + 1).join("\n");
  return after ? `${before}\n${itemLine}\n${after}` : `${before}\n${itemLine}`;
}

/** Parameters for computing the content a save would produce. */
export interface ComputeUpdateParams {
  config: EditItemConfig;
  /** Trimmed key the user entered */
  key: string;
  /** Trimmed value the user entered */
  value: string;
  /** Resolved target section label */
  targetSection: string;
  /** Editing an existing item (vs adding a new one) */
  isEditing: boolean;
  /** The item's original key (editing only) */
  existingKey?: string | undefined;
  /** The item's original section label (editing only) */
  originalSection?: string | undefined;
  /** 0-based instance of the original section label */
  sectionOccurrence?: number | undefined;
}

/**
 * Computes the file content a save would write.
 *
 * Pure: reads nothing, writes nothing. Throws an Error carrying the
 * user-facing message when the existing definition cannot be resolved
 * unambiguously (see `replaceFirstScoped`).
 */
export function computeUpdatedContent(zshrcContent: string, params: ComputeUpdateParams): string {
  const { config, key, value, targetSection, isEditing, existingKey, originalSection, sectionOccurrence } = params;

  if (isEditing && existingKey) {
    const pattern = config.generatePattern(existingKey);
    const sectionChanged = originalSection !== targetSection;

    if (sectionChanged) {
      // Moving to a different section — remove from the old location
      // (scoped so a duplicate elsewhere is not the one removed), then
      // insert into the target.
      const removal = replaceFirstScoped(
        zshrcContent,
        originalSection,
        pattern,
        () => "",
        (line) => config.matchesDisplayLine(line, existingKey),
        sectionOccurrence ?? 0,
      );
      if (!removal.found) {
        throw new Error(scopedFailureMessage(removal.reason, config.itemTypeCapitalized, existingKey));
      }
      const cleaned = removal.content.replace(/\n\n\n+/g, "\n\n");
      return insertIntoSection(cleaned, targetSection, config.generateLine(key, value));
    }

    // Same section — update the line in place
    const update = replaceFirstScoped(
      zshrcContent,
      originalSection,
      pattern,
      preservingReplacer(pattern, config.generateReplacement(key, value)),
      (line) => config.matchesDisplayLine(line, existingKey),
      sectionOccurrence ?? 0,
    );
    if (!update.found) {
      throw new Error(scopedFailureMessage(update.reason, config.itemTypeCapitalized, existingKey));
    }
    return update.content;
  }

  // Adding a new item
  return insertIntoSection(zshrcContent, targetSection, config.generateLine(key, value));
}

/** Parameters for computing the content a delete would produce. */
export interface ComputeDeleteParams {
  config: EditItemConfig;
  existingKey: string;
  sectionLabel?: string | undefined;
  sectionOccurrence?: number | undefined;
}

/**
 * Computes the file content a delete would write. Pure; throws with the
 * user-facing message when the definition cannot be resolved.
 */
export function computeDeletedContent(zshrcContent: string, params: ComputeDeleteParams): string {
  const { config, existingKey, sectionLabel, sectionOccurrence } = params;
  const removal = replaceFirstScoped(
    zshrcContent,
    sectionLabel,
    config.generatePattern(existingKey),
    () => "",
    (line) => config.matchesDisplayLine(line, existingKey),
    sectionOccurrence ?? 0,
  );
  if (!removal.found) {
    throw new Error(scopedFailureMessage(removal.reason, config.itemTypeCapitalized, existingKey));
  }
  return removal.content;
}
