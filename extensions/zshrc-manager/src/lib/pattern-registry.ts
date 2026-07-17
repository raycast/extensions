/**
 * Centralized pattern registry for zsh parsing
 *
 * This module provides a single source of truth for all regex patterns
 * used throughout the application, eliminating duplication and ensuring
 * consistency across parsing functions.
 *
 * All patterns are derived from PARSING_CONSTANTS.PATTERNS to ensure
 * consistency with the main parser.
 */

import { PARSING_CONSTANTS } from "../constants";

/**
 * Creates a global regex from a source pattern for counting matches
 */
function createGlobalPattern(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, "gm");
}

/**
 * Counts matches of a pattern in content
 */
function countMatches(content: string, pattern: RegExp): number {
  const matches = content.match(createGlobalPattern(pattern));
  return matches ? matches.length : 0;
}

/**
 * Pattern registry for counting entries in content
 * Uses the same patterns as the main parser to ensure consistency
 */
const PATTERN_REGISTRY = {
  /**
   * Count aliases in content
   * @param content The content to analyze
   * @returns Number of alias declarations found
   */
  countAliases: (content: string): number => {
    return countMatches(content, PARSING_CONSTANTS.PATTERNS.ALIAS);
  },

  /**
   * Count exports in content
   * @param content The content to analyze
   * @returns Number of export declarations found
   */
  countExports: (content: string): number => {
    return countMatches(content, PARSING_CONSTANTS.PATTERNS.EXPORT);
  },

  /**
   * Count eval commands in content
   * @param content The content to analyze
   * @returns Number of eval commands found
   */
  countEvals: (content: string): number => {
    return countMatches(content, PARSING_CONSTANTS.PATTERNS.EVAL);
  },

  /**
   * Count setopt commands in content
   * @param content The content to analyze
   * @returns Number of setopt commands found
   */
  countSetopts: (content: string): number => {
    return countMatches(content, PARSING_CONSTANTS.PATTERNS.SETOPT);
  },

  /**
   * Count plugin declarations in content
   * @param content The content to analyze
   * @returns Number of plugin declarations found
   */
  countPlugins: (content: string): number => {
    return countMatches(content, PARSING_CONSTANTS.PATTERNS.PLUGIN);
  },

  /**
   * Count function definitions in content
   * @param content The content to analyze
   * @returns Number of function definitions found
   */
  countFunctions: (content: string): number => {
    return countMatches(content, PARSING_CONSTANTS.PATTERNS.FUNCTION);
  },

  /**
   * Count source commands in content
   * @param content The content to analyze
   * @returns Number of source commands found
   */
  countSources: (content: string): number => {
    return countMatches(content, PARSING_CONSTANTS.PATTERNS.SOURCE);
  },

  /**
   * Count autoload commands in content
   * @param content The content to analyze
   * @returns Number of autoload commands found
   */
  countAutoloads: (content: string): number => {
    return countMatches(content, PARSING_CONSTANTS.PATTERNS.AUTOLOAD);
  },

  /**
   * Count fpath declarations in content
   * @param content The content to analyze
   * @returns Number of fpath declarations found
   */
  countFpaths: (content: string): number => {
    return countMatches(content, PARSING_CONSTANTS.PATTERNS.FPATH);
  },

  /**
   * Count PATH declarations in content
   * @param content The content to analyze
   * @returns Number of PATH declarations found
   */
  countPaths: (content: string): number => {
    return countMatches(content, PARSING_CONSTANTS.PATTERNS.PATH);
  },

  /**
   * Count theme declarations in content
   * @param content The content to analyze
   * @returns Number of theme declarations found
   */
  countThemes: (content: string): number => {
    return countMatches(content, PARSING_CONSTANTS.PATTERNS.THEME);
  },

  /**
   * Count completion commands in content
   * @param content The content to analyze
   * @returns Number of completion commands found
   */
  countCompletions: (content: string): number => {
    return countMatches(content, PARSING_CONSTANTS.PATTERNS.COMPLETION);
  },

  /**
   * Count history settings in content
   * @param content The content to analyze
   * @returns Number of history settings found
   */
  countHistory: (content: string): number => {
    return countMatches(content, PARSING_CONSTANTS.PATTERNS.HISTORY);
  },

  /**
   * Count keybinding commands in content
   * @param content The content to analyze
   * @returns Number of keybinding commands found
   */
  countKeybindings: (content: string): number => {
    return countMatches(content, PARSING_CONSTANTS.PATTERNS.KEYBINDING);
  },
} as const;

/**
 * Count all pattern matches in content
 * @param content The content to analyze
 * @returns Object with counts for each pattern type
 */
export function countAllPatterns(content: string) {
  return {
    aliases: PATTERN_REGISTRY.countAliases(content),
    exports: PATTERN_REGISTRY.countExports(content),
    evals: PATTERN_REGISTRY.countEvals(content),
    setopts: PATTERN_REGISTRY.countSetopts(content),
    plugins: PATTERN_REGISTRY.countPlugins(content),
    functions: PATTERN_REGISTRY.countFunctions(content),
    sources: PATTERN_REGISTRY.countSources(content),
    autoloads: PATTERN_REGISTRY.countAutoloads(content),
    fpaths: PATTERN_REGISTRY.countFpaths(content),
    paths: PATTERN_REGISTRY.countPaths(content),
    themes: PATTERN_REGISTRY.countThemes(content),
    completions: PATTERN_REGISTRY.countCompletions(content),
    history: PATTERN_REGISTRY.countHistory(content),
    keybindings: PATTERN_REGISTRY.countKeybindings(content),
  };
}
