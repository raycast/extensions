/**
 * Centralized pattern registry for zsh parsing
 *
 * This module provides a single source of truth for all regex patterns
 * used throughout the application, eliminating duplication and ensuring
 * consistency across parsing functions.
 */

import { PARSING_CONSTANTS } from "../constants";

/**
 * Pattern registry for counting entries in content
 * Uses the same patterns as the main parser but optimized for counting
 */
export const PATTERN_REGISTRY = {
  /**
   * Count aliases in content
   * @param content The content to analyze
   * @returns Number of alias declarations found
   */
  countAliases: (content: string): number => {
    const matches = content.match(
      new RegExp(PARSING_CONSTANTS.PATTERNS.ALIAS.source, "gm"),
    );
    return matches ? matches.length : 0;
  },

  /**
   * Count exports in content
   * @param content The content to analyze
   * @returns Number of export declarations found
   */
  countExports: (content: string): number => {
    const matches = content.match(/^\s*(?:export|typeset\s+-x)\s+/gm);
    return matches ? matches.length : 0;
  },

  /**
   * Count eval commands in content
   * @param content The content to analyze
   * @returns Number of eval commands found
   */
  countEvals: (content: string): number => {
    const matches = content.match(/^\s*eval\s+/gm);
    return matches ? matches.length : 0;
  },

  /**
   * Count setopt commands in content
   * @param content The content to analyze
   * @returns Number of setopt commands found
   */
  countSetopts: (content: string): number => {
    const matches = content.match(/^\s*setopt\s+/gm);
    return matches ? matches.length : 0;
  },

  /**
   * Count plugin declarations in content
   * @param content The content to analyze
   * @returns Number of plugin declarations found
   */
  countPlugins: (content: string): number => {
    const matches = content.match(/^\s*plugins\s*=/gm);
    return matches ? matches.length : 0;
  },

  /**
   * Count function definitions in content
   * @param content The content to analyze
   * @returns Number of function definitions found
   */
  countFunctions: (content: string): number => {
    const matches = content.match(
      /^\s*[A-Za-z_][A-Za-z0-9_]*\s*\(\s*\)\s*\{/gm,
    );
    return matches ? matches.length : 0;
  },

  /**
   * Count source commands in content
   * @param content The content to analyze
   * @returns Number of source commands found
   */
  countSources: (content: string): number => {
    const matches = content.match(/^\s*source\s+/gm);
    return matches ? matches.length : 0;
  },

  /**
   * Count autoload commands in content
   * @param content The content to analyze
   * @returns Number of autoload commands found
   */
  countAutoloads: (content: string): number => {
    const matches = content.match(/^\s*autoload\s+/gm);
    return matches ? matches.length : 0;
  },

  /**
   * Count fpath declarations in content
   * @param content The content to analyze
   * @returns Number of fpath declarations found
   */
  countFpaths: (content: string): number => {
    const matches = content.match(/^\s*fpath\s*=/gm);
    return matches ? matches.length : 0;
  },

  /**
   * Count PATH declarations in content
   * @param content The content to analyze
   * @returns Number of PATH declarations found
   */
  countPaths: (content: string): number => {
    const matches = content.match(/^\s*PATH\s*=/gm);
    return matches ? matches.length : 0;
  },

  /**
   * Count theme declarations in content
   * @param content The content to analyze
   * @returns Number of theme declarations found
   */
  countThemes: (content: string): number => {
    const matches = content.match(/^\s*ZSH_THEME\s*=/gm);
    return matches ? matches.length : 0;
  },

  /**
   * Count completion commands in content
   * @param content The content to analyze
   * @returns Number of completion commands found
   */
  countCompletions: (content: string): number => {
    const matches = content.match(/^\s*compinit/gm);
    return matches ? matches.length : 0;
  },

  /**
   * Count history settings in content
   * @param content The content to analyze
   * @returns Number of history settings found
   */
  countHistory: (content: string): number => {
    const matches = content.match(/^\s*HIST[A-Z_]*\s*=/gm);
    return matches ? matches.length : 0;
  },

  /**
   * Count keybinding commands in content
   * @param content The content to analyze
   * @returns Number of keybinding commands found
   */
  countKeybindings: (content: string): number => {
    const matches = content.match(/^\s*bindkey\s+/gm);
    return matches ? matches.length : 0;
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
