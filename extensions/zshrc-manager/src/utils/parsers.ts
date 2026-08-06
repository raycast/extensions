/**
 * Utility functions for parsing zshrc content.
 *
 * These are thin projections over the pattern registry
 * (src/lib/pattern-registry.ts), which is the single parser. Every view,
 * statistic, and search surface derives from the same extraction, so
 * counts and lists cannot disagree. The legacy return shapes are
 * preserved; line positions live on the registry output for callers
 * that need them.
 */

import { extractEntries } from "../lib/pattern-registry";

/**
 * Parses aliases from zshrc content
 * @param content The raw content to parse
 * @returns Array of alias objects with name and command
 */
export function parseAliases(content: string): ReadonlyArray<{ name: string; command: string }> {
  return extractEntries(content).aliases.map(({ name, command }) => ({ name, command }));
}

/**
 * Parses exports from zshrc content
 * @param content The raw content to parse
 * @returns Array of export objects with variable and value
 */
export function parseExports(content: string): ReadonlyArray<{ variable: string; value: string }> {
  return extractEntries(content).exports.map(({ variable, value }) => ({ variable, value }));
}

/**
 * Parses eval commands from zshrc content
 * @param content The raw content to parse
 * @returns Array of eval objects with command
 */
export function parseEvals(content: string): ReadonlyArray<{ command: string }> {
  return extractEntries(content).evals.map(({ command }) => ({ command }));
}

/**
 * Parses setopt commands from zshrc content
 * @param content The raw content to parse
 * @returns Array of setopt objects with option
 */
export function parseSetopts(content: string): ReadonlyArray<{ option: string }> {
  return extractEntries(content).setopts.map(({ option }) => ({ option }));
}

/**
 * Parses plugins from zshrc content
 * @param content The raw content to parse
 * @returns Array of plugin names
 */
export function parsePlugins(content: string): ReadonlyArray<{ name: string }> {
  return extractEntries(content).plugins.map(({ name }) => ({ name }));
}

/**
 * Parses functions from zshrc content
 * @param content The raw content to parse
 * @returns Array of function names
 */
export function parseFunctions(content: string): ReadonlyArray<{ name: string }> {
  return extractEntries(content).functions.map(({ name }) => ({ name }));
}

/**
 * Parses source commands from zshrc content
 * @param content The raw content to parse
 * @returns Array of source objects with path
 */
export function parseSources(content: string): ReadonlyArray<{ path: string }> {
  return extractEntries(content).sources.map(({ path }) => ({ path }));
}

/**
 * Parses PATH modifications from zshrc content
 * Matches: export/typeset/declare PATH=..., PATH+=..., path+=(...), path=(...),
 * PATH="$PATH:...", PATH="...:$PATH", and plain PATH=... assignments
 * @param content The raw content to parse
 * @returns Array of PATH objects with entry and type (export, append, prepend, set)
 */
export function parsePathEntries(
  content: string,
): ReadonlyArray<{ entry: string; type: "export" | "append" | "prepend" | "set" }> {
  return extractEntries(content).pathEntries.map(({ entry, type }) => ({ entry, type }));
}

/**
 * Parses FPATH modifications from zshrc content
 * @param content The raw content to parse
 * @returns Array of FPATH objects with entry and type
 */
export function parseFpathEntries(
  content: string,
): ReadonlyArray<{ entry: string; type: "export" | "append" | "prepend" | "set" }> {
  return extractEntries(content).fpathEntries.map(({ entry, type }) => ({ entry, type }));
}

/**
 * Keybinding result type
 */
export interface KeybindingResult {
  key: string;
  command: string;
  widget?: string | undefined;
  keymap?: string | undefined;
}

/**
 * Parses keybindings (bindkey) from zshrc content
 * Supports:
 * - Basic: bindkey "key" command
 * - String replacement: bindkey -s "key" "replacement"
 * - Keymap-specific: bindkey -M keymap "key" command
 * - Combined: bindkey -M keymap -s "key" "replacement"
 *
 * @param content The raw content to parse
 * @returns Array of keybinding objects with key, command, optional widget, and optional keymap
 */
export function parseKeybindings(content: string): ReadonlyArray<KeybindingResult> {
  return extractEntries(content).keybindings.map(({ key, command, widget, keymap }) => ({
    key,
    command,
    widget,
    keymap,
  }));
}
