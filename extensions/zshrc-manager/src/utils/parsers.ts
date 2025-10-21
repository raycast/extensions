/**
 * Utility functions for parsing zshrc content
 *
 * @deprecated Use the centralized pattern registry in src/lib/pattern-registry.ts
 * and the main parser in src/lib/parse-zshrc.ts instead of these individual functions.
 * These functions are kept for backward compatibility but will be removed in a future version.
 */

/**
 * Parses aliases from zshrc content
 * @param content The raw content to parse
 * @returns Array of alias objects with name and command
 */
export function parseAliases(
  content: string,
): ReadonlyArray<{ name: string; command: string }> {
  const regex =
    /^(?:\s*)alias\s+([A-Za-z0-9_.:-]+)=(?:'|")(.*?)(?:'|")(?:\s*)$/gm;
  const result: Array<{ name: string; command: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1] && match[2]) {
      result.push({ name: match[1], command: match[2] });
    }
  }
  return result;
}

/**
 * Parses exports from zshrc content
 * @param content The raw content to parse
 * @returns Array of export objects with variable and value
 */
export function parseExports(
  content: string,
): ReadonlyArray<{ variable: string; value: string }> {
  const regex =
    /^(?:\s*)(?:export|typeset\s+-x)\s+([A-Za-z_][A-Za-z0-9_]*)=(.*?)(?:\s*)$/gm;
  const result: Array<{ variable: string; value: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1] && match[2]) {
      result.push({ variable: match[1], value: match[2] });
    }
  }
  return result;
}

/**
 * Parses eval commands from zshrc content
 * @param content The raw content to parse
 * @returns Array of eval objects with command
 */
export function parseEvals(
  content: string,
): ReadonlyArray<{ command: string }> {
  const regex = /^(?:\s*)eval\s+(.+?)(?:\s*)$/gm;
  const result: Array<{ command: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      result.push({ command: match[1] });
    }
  }
  return result;
}

/**
 * Parses setopt commands from zshrc content
 * @param content The raw content to parse
 * @returns Array of setopt objects with option
 */
export function parseSetopts(
  content: string,
): ReadonlyArray<{ option: string }> {
  const regex = /^(?:\s*)setopt\s+(.+?)(?:\s*)$/gm;
  const result: Array<{ option: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      result.push({ option: match[1] });
    }
  }
  return result;
}

/**
 * Parses plugins from zshrc content
 * @param content The raw content to parse
 * @returns Array of plugin names
 */
export function parsePlugins(content: string): ReadonlyArray<{ name: string }> {
  const regex = /^(?:\s*)plugins\s*=\s*\(([^)]+)\)(?:\s*)$/gm;
  const result: Array<{ name: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      const pluginList = match[1].split(/\s+/).filter((p) => p.trim());
      pluginList.forEach((plugin) => {
        result.push({ name: plugin.trim() });
      });
    }
  }
  return result;
}

/**
 * Parses functions from zshrc content
 * @param content The raw content to parse
 * @returns Array of function names
 */
export function parseFunctions(
  content: string,
): ReadonlyArray<{ name: string }> {
  const regex = /^(?:\s*)([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*\{(?:\s*)$/gm;
  const result: Array<{ name: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      result.push({ name: match[1] });
    }
  }
  return result;
}

/**
 * Parses source commands from zshrc content
 * @param content The raw content to parse
 * @returns Array of source objects with path
 */
export function parseSources(content: string): ReadonlyArray<{ path: string }> {
  const regex = /^(?:\s*)source\s+(.+?)(?:\s*)$/gm;
  const result: Array<{ path: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      result.push({ path: match[1] });
    }
  }
  return result;
}

/**
 * Parses autoload commands from zshrc content
 * @param content The raw content to parse
 * @returns Array of autoload objects with function name
 */
export function parseAutoloads(
  content: string,
): ReadonlyArray<{ function: string }> {
  const regex =
    /^(?:\s*)autoload\s+(?:-Uz\s+)?([A-Za-z_][A-Za-z0-9_]*)(?:\s*)$/gm;
  const result: Array<{ function: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      result.push({ function: match[1] });
    }
  }
  return result;
}

/**
 * Parses fpath entries from zshrc content
 * @param content The raw content to parse
 * @returns Array of fpath objects with directories
 */
export function parseFpaths(
  content: string,
): ReadonlyArray<{ directories: ReadonlyArray<string> }> {
  const regex = /^(?:\s*)fpath\s*=\s*\(([^)]+)\)(?:\s*)$/gm;
  const result: Array<{ directories: string[] }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      const directories = match[1].split(/\s+/).filter((d) => d.trim());
      result.push({ directories: directories.map((d) => d.trim()) });
    }
  }
  return result;
}

/**
 * Parses PATH entries from zshrc content
 * @param content The raw content to parse
 * @returns Array of PATH objects with value
 */
export function parsePaths(content: string): ReadonlyArray<{ value: string }> {
  const regex = /^(?:\s*)PATH\s*=\s*(.+?)(?:\s*)$/gm;
  const result: Array<{ value: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      result.push({ value: match[1] });
    }
  }
  return result;
}

/**
 * Parses theme entries from zshrc content
 * @param content The raw content to parse
 * @returns Array of theme objects with name
 */
export function parseThemes(content: string): ReadonlyArray<{ name: string }> {
  const regex = /^(?:\s*)ZSH_THEME\s*=\s*(?:'|")(.*?)(?:'|")(?:\s*)$/gm;
  const result: Array<{ name: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      result.push({ name: match[1] });
    }
  }
  return result;
}

/**
 * Parses completion commands from zshrc content
 * @param content The raw content to parse
 * @returns Array of completion objects with command
 */
export function parseCompletions(
  content: string,
): ReadonlyArray<{ command: string }> {
  const regex = /^(?:\s*)compinit(?:\s*)$/gm;
  const result: Array<{ command: string }> = [];
  while (regex.exec(content) !== null) {
    result.push({ command: "compinit" });
  }
  return result;
}

/**
 * Parses history settings from zshrc content
 * @param content The raw content to parse
 * @returns Array of history objects with variable and value
 */
export function parseHistorySettings(
  content: string,
): ReadonlyArray<{ variable: string; value: string }> {
  const regex = /^(?:\s*)(HIST[A-Z_]*)\s*=\s*(.+?)(?:\s*)$/gm;
  const result: Array<{ variable: string; value: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1] && match[2]) {
      result.push({ variable: match[1], value: match[2] });
    }
  }
  return result;
}

/**
 * Parses keybinding commands from zshrc content
 * @param content The raw content to parse
 * @returns Array of keybinding objects with command
 */
export function parseKeybindings(
  content: string,
): ReadonlyArray<{ command: string }> {
  const regex = /^(?:\s*)bindkey\s+(.+?)(?:\s*)$/gm;
  const result: Array<{ command: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      result.push({ command: match[1] });
    }
  }
  return result;
}
