/**
 * Preference management for section detection patterns
 *
 * Provides utilities to read and validate user-configured section patterns
 * from Raycast preferences.
 */

import { getPreferenceValues } from "@raycast/api";

/**
 * User preferences for section detection
 */
export interface SectionPrefs {
  /** Enable built-in section patterns */
  enableDefaults: boolean;
  /** Enable custom header pattern */
  enableCustomHeaderPattern: boolean;
  /** Custom header pattern regex string */
  customHeaderPattern?: string;
  /** Enable custom start/end patterns */
  enableCustomStartEndPatterns: boolean;
  /** Custom start pattern regex string */
  customStartPattern?: string;
  /** Custom end pattern regex string */
  customEndPattern?: string;
}

/**
 * Reads section preferences from Raycast configuration
 *
 * @returns Section preferences object
 */
export function getSectionPrefs(): SectionPrefs {
  return getPreferenceValues<SectionPrefs>();
}

/**
 * Validates and compiles a regex pattern from user input
 *
 * @param pattern The regex pattern string from preferences
 * @param description Description for error messages
 * @returns Compiled regex or null if invalid
 */
export function compilePattern(pattern: string | undefined, description: string): RegExp | null {
  if (!pattern || pattern.trim().length === 0) {
    return null;
  }

  try {
    // Auto-anchor patterns and make them case-insensitive
    const anchoredPattern = pattern.startsWith("^") ? pattern : `^${pattern}`;
    return new RegExp(`${anchoredPattern}`, "i");
  } catch (error) {
    console.warn(`Invalid ${description} pattern: ${pattern}`, error);
    return null;
  }
}

/**
 * Validates that a regex pattern contains exactly one capture group
 *
 * @param pattern The regex pattern to validate
 * @returns True if pattern has exactly one capture group
 */
export function hasCaptureGroup(pattern: string): boolean {
  const captureGroupRegex = /\((?!\?[!=:])[^)]*\)/g;
  const matches = pattern.match(captureGroupRegex);
  return matches !== null && matches.length === 1;
}

/**
 * Gets compiled custom patterns from preferences
 *
 * @returns Object with compiled custom patterns
 */
export function getCustomPatterns(): {
  headerPattern: RegExp | null;
  startPattern: RegExp | null;
  endPattern: RegExp | null;
} {
  const prefs = getSectionPrefs();

  let headerPattern: RegExp | null = null;
  let startPattern: RegExp | null = null;
  let endPattern: RegExp | null = null;

  if (prefs.enableCustomHeaderPattern && prefs.customHeaderPattern) {
    if (hasCaptureGroup(prefs.customHeaderPattern)) {
      headerPattern = compilePattern(prefs.customHeaderPattern, "header");
    } else {
      console.warn("Custom header pattern must contain exactly one capture group");
    }
  }

  if (prefs.enableCustomStartEndPatterns) {
    if (prefs.customStartPattern && hasCaptureGroup(prefs.customStartPattern)) {
      startPattern = compilePattern(prefs.customStartPattern, "start");
    }
    if (prefs.customEndPattern) {
      endPattern = compilePattern(prefs.customEndPattern, "end");
    }
  }

  return {
    headerPattern,
    startPattern,
    endPattern,
  };
}
