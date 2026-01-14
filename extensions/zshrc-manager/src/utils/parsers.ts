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
export function parseAliases(content: string): ReadonlyArray<{ name: string; command: string }> {
  const regex = /^(?:\s*)alias\s+([A-Za-z0-9_.:-]+)=(?:'|")(.*?)(?:'|")(?:\s*)$/gm;
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
export function parseExports(content: string): ReadonlyArray<{ variable: string; value: string }> {
  const regex = /^(?:\s*)(?:export|typeset\s+-x)\s+([A-Za-z_][A-Za-z0-9_]*)=(.*?)(?:\s*)$/gm;
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
export function parseEvals(content: string): ReadonlyArray<{ command: string }> {
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
export function parseSetopts(content: string): ReadonlyArray<{ option: string }> {
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
export function parseFunctions(content: string): ReadonlyArray<{ name: string }> {
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
