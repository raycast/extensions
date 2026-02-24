/**
 * Section Writer Module
 *
 * Handles writing content to zshrc sections while respecting user's
 * preferred section format and merging with existing sections.
 */

import { readZshrcFileRaw, writeZshrcFile } from "./zsh";
import { getSectionPrefs } from "./preferences";
import { analyzeSectionMarkers, type SectionMarker } from "./section-detector";
import { normalizeSectionName } from "./icons/section-normalizer";
import type { ParsedAlias } from "./parse-alias-file";
import { saveToHistory } from "./history";

/**
 * Section format templates for generating headers.
 * Maps format type to a function that generates the header line.
 */
const SECTION_TEMPLATES: Record<string, (name: string) => { start: string; end?: string }> = {
  dashed: (name) => ({
    start: `# --- ${name} --- #`,
    end: `# --- End ${name} --- #`,
  }),
  bracketed: (name) => ({
    start: `# [ ${name} ]`,
  }),
  hash: (name) => ({
    start: `# # ${name}`,
  }),
  labeled: (name) => ({
    start: `# section: ${name}`,
  }),
  custom_markers: (name) => ({
    start: `# @start ${name}`,
    end: `# @end ${name}`,
  }),
};

/**
 * Detects the predominant section format used in the user's zshrc.
 * Falls back to "dashed" if no sections exist or mixed formats.
 */
export function detectUserSectionFormat(content: string): string {
  const markers = analyzeSectionMarkers(content);

  if (markers.length === 0) {
    return "dashed"; // Default
  }

  // Count format types
  const formatCounts = new Map<string, number>();
  for (const marker of markers) {
    // Map marker types to our template keys
    let formatKey: string;
    switch (marker.type) {
      case "dashed_start":
      case "dashed_end":
        formatKey = "dashed";
        break;
      case "bracketed":
        formatKey = "bracketed";
        break;
      case "hash":
        formatKey = "hash";
        break;
      case "labeled":
        formatKey = "labeled";
        break;
      case "custom_start":
      case "custom_end":
        formatKey = "custom_markers";
        break;
      default:
        continue; // Skip function markers, etc.
    }
    formatCounts.set(formatKey, (formatCounts.get(formatKey) || 0) + 1);
  }

  // Find most common format
  let maxCount = 0;
  let predominantFormat = "dashed";
  for (const [format, count] of formatCounts) {
    if (count > maxCount) {
      maxCount = count;
      predominantFormat = format;
    }
  }

  return predominantFormat;
}

/**
 * Generates a section header (and optional end marker) in the specified format.
 */
export function generateSectionHeader(name: string, format?: string): { start: string; end?: string } {
  const templateFn = SECTION_TEMPLATES[format || "dashed"] ?? SECTION_TEMPLATES["dashed"];
  return templateFn!(name);
}

/**
 * Common suffixes to strip when extracting core section name.
 */
const SECTION_SUFFIXES = ["aliases", "alias", "config", "configuration", "stuff", "settings", "shortcuts", "commands"];

/**
 * Extracts the core technology/topic name from a section name.
 * e.g., "Git Aliases" -> "git", "Docker Config" -> "docker"
 */
function extractCoreName(normalized: string): string {
  let core = normalized;
  for (const suffix of SECTION_SUFFIXES) {
    if (core.endsWith(suffix) && core.length > suffix.length) {
      core = core.slice(0, -suffix.length);
      break;
    }
  }
  return core;
}

/**
 * Calculates match quality between target and section names.
 * Returns a score: 0 = no match, higher = better match.
 *
 * Matching rules (in priority order):
 * 1. Exact normalized match (score: 100)
 * 2. Exact core match - "git" == "git" (score: 90)
 * 3. Core starts with target core or vice versa, min 3 chars (score: 50)
 */
function calculateMatchScore(targetNormalized: string, targetCore: string, sectionNormalized: string): number {
  // Exact normalized match
  if (targetNormalized === sectionNormalized) {
    return 100;
  }

  const sectionCore = extractCoreName(sectionNormalized);

  // Exact core match
  if (targetCore && sectionCore && targetCore === sectionCore) {
    return 90;
  }

  // Prefix matching (only if cores are at least 3 chars to avoid false positives)
  if (targetCore && sectionCore && targetCore.length >= 3 && sectionCore.length >= 3) {
    // One is a prefix of the other (e.g., "docker" matches "dockercompose")
    if (sectionCore.startsWith(targetCore) || targetCore.startsWith(sectionCore)) {
      return 50;
    }
  }

  return 0;
}

/**
 * Finds an existing section that matches the given name.
 * Uses conservative matching to avoid false positives.
 *
 * Matching rules:
 * - "Git Aliases" matches "Git", "Git Stuff", "Git Config" (same core)
 * - "Docker" matches "Docker Aliases" (same core)
 * - "Git" does NOT match "Digital" (no false substring matches)
 *
 * If multiple sections match, returns the best match (highest score).
 *
 * @returns The matching section marker and its content bounds, or null
 */
export function findMatchingSection(
  content: string,
  targetName: string,
): { marker: SectionMarker; endLine: number } | null {
  const markers = analyzeSectionMarkers(content);
  const lines = content.split("\n");

  // Normalize target for matching
  const targetNormalized = normalizeSectionName(targetName);
  const targetCore = extractCoreName(targetNormalized);

  // Find all matches with scores
  const matches: Array<{ marker: SectionMarker; index: number; score: number }> = [];

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    if (!marker) continue;

    // Skip end markers and function markers
    if (["dashed_end", "custom_end", "function_start", "function_end"].includes(marker.type)) {
      continue;
    }

    const sectionNormalized = normalizeSectionName(marker.name);
    const score = calculateMatchScore(targetNormalized, targetCore, sectionNormalized);

    if (score > 0) {
      matches.push({ marker, index: i, score });
    }
  }

  if (matches.length === 0) {
    return null;
  }

  // Pick the best match (highest score, or first if tied)
  matches.sort((a, b) => b.score - a.score);
  const bestMatch = matches[0];
  if (!bestMatch) {
    return null;
  }

  // Find the end of this section (next section start or end marker, or EOF)
  let endLine = lines.length;
  for (let j = bestMatch.index + 1; j < markers.length; j++) {
    const nextMarker = markers[j];
    if (!nextMarker) continue;
    // If it's an end marker or a new section start
    if (
      ["dashed_end", "custom_end"].includes(nextMarker.type) ||
      ["dashed_start", "custom_start", "bracketed", "hash", "labeled"].includes(nextMarker.type)
    ) {
      endLine = nextMarker.lineNumber - 1;
      break;
    }
  }

  return { marker: bestMatch.marker, endLine };
}

/**
 * Formats aliases as zsh alias lines.
 */
export function formatAliasLines(aliases: ParsedAlias[], includeComments = true): string[] {
  const lines: string[] = [];

  for (const alias of aliases) {
    if (includeComments && alias.description) {
      lines.push(`# ${alias.description}`);
    }
    const escapedValue = alias.value.replace(/'/g, "'\\''");
    lines.push(`alias ${alias.name}='${escapedValue}'`);
  }

  return lines;
}

/**
 * Adds aliases to the user's zshrc, respecting their section format
 * and merging with existing matching sections.
 *
 * @param sectionName The name for the section (e.g., "Git Aliases")
 * @param aliases The aliases to add
 * @param attribution Optional attribution string (e.g., "Oh My Zsh" or "Curated collection")
 * @returns Object with success status and details
 */
export async function addAliasesToZshrc(
  sectionName: string,
  aliases: ParsedAlias[],
  attribution?: string,
): Promise<{ success: boolean; message: string; addedTo: "existing" | "new"; sectionName: string }> {
  let content: string;

  try {
    content = await readZshrcFileRaw();
  } catch {
    content = "";
  }

  // Check user preferences for format preference
  const prefs = getSectionPrefs();
  let format: string;

  // If user has custom patterns enabled, try to detect their format
  // Otherwise detect from existing content
  if (prefs.enableCustomHeaderPattern || prefs.enableCustomStartEndPatterns) {
    // User has custom config, detect from content
    format = detectUserSectionFormat(content);
  } else if (prefs.enableDefaults) {
    // Use default format detection
    format = detectUserSectionFormat(content);
  } else {
    format = "dashed"; // Fallback
  }

  const aliasLines = formatAliasLines(aliases);

  // Try to find an existing matching section
  const existingSection = findMatchingSection(content, sectionName);

  if (existingSection) {
    // Append to existing section
    const lines = content.split("\n");
    const insertLine = existingSection.endLine;

    // Insert aliases before the end of the section
    // Add a blank line separator if the previous line isn't blank
    const insertContent: string[] = [];
    if (lines[insertLine - 1]?.trim() !== "") {
      insertContent.push("");
    }
    const addedComment = attribution ? `# Added from ${sectionName} (${attribution})` : `# Added from ${sectionName}`;
    insertContent.push(addedComment);
    insertContent.push(...aliasLines);

    lines.splice(insertLine, 0, ...insertContent);

    // Save to history before writing for undo support
    await saveToHistory(`Add ${aliases.length} aliases to "${existingSection.marker.name}"`);
    await writeZshrcFile(lines.join("\n"));

    return {
      success: true,
      message: `Added ${aliases.length} aliases to existing section "${existingSection.marker.name}"`,
      addedTo: "existing",
      sectionName: existingSection.marker.name,
    };
  } else {
    // Create new section with attribution if provided
    const displayName = attribution ? `${sectionName} (${attribution})` : sectionName;
    const header = generateSectionHeader(displayName, format);
    const newSection: string[] = ["", header.start, "", ...aliasLines];

    if (header.end) {
      // Use consistent displayName for end marker (matches start marker)
      newSection.push("", header.end);
    }

    newSection.push("");

    // Append to content and write
    const newContent = content + newSection.join("\n");

    // Save to history before writing for undo support
    await saveToHistory(`Create section "${displayName}" with ${aliases.length} aliases`);
    await writeZshrcFile(newContent);

    return {
      success: true,
      message: `Created new section "${displayName}" with ${aliases.length} aliases`,
      addedTo: "new",
      sectionName: displayName,
    };
  }
}

/**
 * Adds a single alias to the user's zshrc.
 */
export async function addSingleAliasToZshrc(
  alias: ParsedAlias,
  collectionName?: string,
): Promise<{ success: boolean; message: string }> {
  let content: string;

  try {
    content = await readZshrcFileRaw();
  } catch {
    content = "";
  }

  // If collection name provided, try to find matching section
  if (collectionName) {
    const existingSection = findMatchingSection(content, collectionName);

    if (existingSection) {
      const lines = content.split("\n");
      const insertLine = existingSection.endLine;

      const aliasLine = `alias ${alias.name}='${alias.value.replace(/'/g, "'\\''")}'`;
      const insertContent: string[] = [];

      if (lines[insertLine - 1]?.trim() !== "") {
        insertContent.push("");
      }
      if (alias.description) {
        insertContent.push(`# ${alias.description}`);
      }
      insertContent.push(aliasLine);

      lines.splice(insertLine, 0, ...insertContent);

      // Save to history before writing for undo support
      await saveToHistory(`Add alias "${alias.name}" to "${existingSection.marker.name}"`);
      await writeZshrcFile(lines.join("\n"));

      return {
        success: true,
        message: `Added "${alias.name}" to section "${existingSection.marker.name}"`,
      };
    }
  }

  // No matching section found - create a new section if collection name provided
  const aliasLine = `alias ${alias.name}='${alias.value.replace(/'/g, "'\\''")}'`;

  if (collectionName) {
    // Create a new section for this collection
    const format = detectUserSectionFormat(content);
    const header = generateSectionHeader(collectionName, format);

    const newSection: string[] = ["", header.start, ""];
    if (alias.description) {
      newSection.push(`# ${alias.description}`);
    }
    newSection.push(aliasLine);

    if (header.end) {
      newSection.push("", header.end);
    }
    newSection.push("");

    const newContent = content + newSection.join("\n");

    // Save to history before writing for undo support
    await saveToHistory(`Add alias "${alias.name}" (create "${collectionName}" section)`);
    await writeZshrcFile(newContent);

    return {
      success: true,
      message: `Added "${alias.name}" to new section "${collectionName}"`,
    };
  }

  // No collection name - just append to end
  const appendContent = alias.description ? `\n# ${alias.description}\n${aliasLine}\n` : `\n${aliasLine}\n`;
  const newContent = content + appendContent;

  // Save to history before writing for undo support
  await saveToHistory(`Add alias "${alias.name}"`);
  await writeZshrcFile(newContent);

  return {
    success: true,
    message: `Added "${alias.name}" to end of zshrc`,
  };
}
