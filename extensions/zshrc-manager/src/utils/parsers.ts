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

/**
 * Parses PATH modifications from zshrc content
 * Matches: export PATH="...", path+=(...), PATH="..."
 * @param content The raw content to parse
 * @returns Array of PATH objects with entry and type (export, append, prepend)
 */
export function parsePathEntries(
  content: string,
): ReadonlyArray<{ entry: string; type: "export" | "append" | "prepend" | "set" }> {
  const result: Array<{ entry: string; type: "export" | "append" | "prepend" | "set" }> = [];

  // Match export PATH="..."
  const exportRegex = /^(?:\s*)export\s+PATH\s*=\s*["']?(.+?)["']?(?:\s*)$/gm;
  let match: RegExpExecArray | null;
  while ((match = exportRegex.exec(content)) !== null) {
    if (match[1]) {
      result.push({ entry: match[1], type: "export" });
    }
  }

  // Match path+=(...) - zsh array append
  const appendRegex = /^(?:\s*)path\+=\s*\(([^)]+)\)(?:\s*)$/gm;
  while ((match = appendRegex.exec(content)) !== null) {
    if (match[1]) {
      const paths = match[1].split(/\s+/).filter((p) => p.trim());
      paths.forEach((p) => {
        result.push({ entry: p.trim(), type: "append" });
      });
    }
  }

  // Match path=(...) - zsh array set (replaces entire path)
  const setRegex = /^(?:\s*)path=\s*\(([^)]+)\)(?:\s*)$/gm;
  while ((match = setRegex.exec(content)) !== null) {
    if (match[1]) {
      const paths = match[1].split(/\s+/).filter((p) => p.trim());
      paths.forEach((p) => {
        result.push({ entry: p.trim(), type: "set" });
      });
    }
  }

  // Match PATH="$PATH:..."
  const pathModifyRegex = /^(?:\s*)PATH\s*=\s*["']?\$PATH:(.+?)["']?(?:\s*)$/gm;
  while ((match = pathModifyRegex.exec(content)) !== null) {
    if (match[1]) {
      result.push({ entry: match[1], type: "append" });
    }
  }

  // Match PATH="...:$PATH"
  const pathPrependRegex = /^(?:\s*)PATH\s*=\s*["']?(.+?):\$PATH["']?(?:\s*)$/gm;
  while ((match = pathPrependRegex.exec(content)) !== null) {
    if (match[1]) {
      result.push({ entry: match[1], type: "prepend" });
    }
  }

  return result;
}

/**
 * Parses FPATH modifications from zshrc content
 * @param content The raw content to parse
 * @returns Array of FPATH objects with entry and type
 */
export function parseFpathEntries(
  content: string,
): ReadonlyArray<{ entry: string; type: "export" | "append" | "prepend" | "set" }> {
  const result: Array<{ entry: string; type: "export" | "append" | "prepend" | "set" }> = [];

  // Match export FPATH="..."
  const exportRegex = /^(?:\s*)export\s+FPATH\s*=\s*["']?(.+?)["']?(?:\s*)$/gm;
  let match: RegExpExecArray | null;
  while ((match = exportRegex.exec(content)) !== null) {
    if (match[1]) {
      result.push({ entry: match[1], type: "export" });
    }
  }

  // Match fpath+=(...) - zsh array append
  const appendRegex = /^(?:\s*)fpath\+=\s*\(([^)]+)\)(?:\s*)$/gm;
  while ((match = appendRegex.exec(content)) !== null) {
    if (match[1]) {
      const paths = match[1].split(/\s+/).filter((p) => p.trim());
      paths.forEach((p) => {
        result.push({ entry: p.trim(), type: "append" });
      });
    }
  }

  // Match fpath=(...) - zsh array set (replaces entire fpath)
  const setRegex = /^(?:\s*)fpath=\s*\(([^)]+)\)(?:\s*)$/gm;
  while ((match = setRegex.exec(content)) !== null) {
    if (match[1]) {
      const paths = match[1].split(/\s+/).filter((p) => p.trim());
      paths.forEach((p) => {
        result.push({ entry: p.trim(), type: "set" });
      });
    }
  }

  // Match FPATH="$FPATH:..."
  const fpathModifyRegex = /^(?:\s*)FPATH\s*=\s*["']?\$FPATH:(.+?)["']?(?:\s*)$/gm;
  while ((match = fpathModifyRegex.exec(content)) !== null) {
    if (match[1]) {
      result.push({ entry: match[1], type: "append" });
    }
  }

  // Match FPATH="...:$FPATH" - prepend pattern
  const fpathPrependRegex = /^(?:\s*)FPATH\s*=\s*["']?(.+?):\$FPATH["']?(?:\s*)$/gm;
  while ((match = fpathPrependRegex.exec(content)) !== null) {
    if (match[1]) {
      result.push({ entry: match[1], type: "prepend" });
    }
  }

  return result;
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
  const result: Array<KeybindingResult> = [];
  const seen = new Set<string>();

  // Helper to add unique results (avoid duplicates from multiple regex matches)
  const addResult = (entry: KeybindingResult) => {
    const key = `${entry.keymap || ""}:${entry.key}:${entry.command}:${entry.widget || ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  };

  // Match bindkey -M keymap -s "key" "replacement" (keymap-specific string replacement)
  // Uses separate patterns for quoted and unquoted keys to avoid greedy matching
  const keymapStringQuotedRegex = /^(?:\s*)bindkey\s+-M\s+(\S+)\s+-s\s+(['"])([^'"]+)\2\s+(['"])([^'"]+)\4(?:\s*)$/gm;
  let match: RegExpExecArray | null;
  while ((match = keymapStringQuotedRegex.exec(content)) !== null) {
    if (match[1] && match[3] && match[5]) {
      addResult({
        key: match[3],
        command: match[5].trim(),
        widget: "string-replacement",
        keymap: match[1],
      });
    }
  }

  // Match bindkey -M keymap "key" command (keymap-specific binding with quoted key)
  const keymapQuotedRegex = /^(?:\s*)bindkey\s+-M\s+(\S+)\s+(['"])([^'"]+)\2\s+(\S+)(?:\s*)$/gm;
  while ((match = keymapQuotedRegex.exec(content)) !== null) {
    if (match[1] && match[3] && match[4]) {
      addResult({
        key: match[3],
        command: match[4].trim(),
        keymap: match[1],
      });
    }
  }

  // Match bindkey -M keymap key command (keymap-specific binding with unquoted key)
  // Unquoted key must not start with a quote
  const keymapUnquotedRegex = /^(?:\s*)bindkey\s+-M\s+(\S+)\s+([^'"\s]\S*)\s+(\S+)(?:\s*)$/gm;
  while ((match = keymapUnquotedRegex.exec(content)) !== null) {
    if (match[1] && match[2] && match[3]) {
      addResult({
        key: match[2],
        command: match[3].trim(),
        keymap: match[1],
      });
    }
  }

  // Match bindkey -s "key" "replacement" (string replacement with quoted args)
  const bindkeyStringQuotedRegex = /^(?:\s*)bindkey\s+-s\s+(['"])([^'"]+)\1\s+(['"])([^'"]+)\3(?:\s*)$/gm;
  while ((match = bindkeyStringQuotedRegex.exec(content)) !== null) {
    if (match[2] && match[4]) {
      addResult({ key: match[2], command: match[4].trim(), widget: "string-replacement" });
    }
  }

  // Match bindkey "key" command (basic with quoted key)
  // Exclude all known bindkey flags: -M (keymap), -s (string), -r (remove), -R (range),
  // -L (list), -l (widgets), -e (emacs), -v (viins), -a (vicmd), -d (delete), -p (prefix), -N (new widget)
  const bindkeyQuotedRegex = /^(?:\s*)bindkey\s+(?!-[MsrRLlevaAdpN])(['"])([^'"]+)\1\s+(\S+)(?:\s*)$/gm;
  while ((match = bindkeyQuotedRegex.exec(content)) !== null) {
    if (match[2] && match[3]) {
      addResult({ key: match[2], command: match[3].trim() });
    }
  }

  // Match bindkey key command (basic with unquoted key, must not have flags)
  // Unquoted key must not start with a quote
  // Exclude all known bindkey flags (same as above)
  const bindkeyUnquotedRegex = /^(?:\s*)bindkey\s+(?!-[MsrRLlevaAdpN])([^'"\s]\S*)\s+(\S+)(?:\s*)$/gm;
  while ((match = bindkeyUnquotedRegex.exec(content)) !== null) {
    if (match[1] && match[2]) {
      addResult({ key: match[1], command: match[2].trim() });
    }
  }

  return result;
}
