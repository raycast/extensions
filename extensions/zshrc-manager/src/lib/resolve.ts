/**
 * Resolved facts about the user's configuration
 *
 * Answers questions that cannot be learned by reading the file itself:
 * whether an alias shadows a real command, whether a sourced file exists,
 * and whether a listed plugin is installed.
 *
 * All checks are pure Node filesystem lookups — no subprocess is ever
 * spawned. Results are cached for the session. A resolution failure
 * degrades to "unknown" (or no answer) rather than surfacing an error:
 * a false "missing" is worse than no answer.
 */

import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parsePathEntries } from "../utils/parsers";
import { getZshrcPath } from "./zsh";

/** Three-valued answer for facts that may be undecidable. */
export type ResolvedFact = "yes" | "no" | "unknown";

/** Session caches, keyed per fact type. */
const shadowCache = new Map<string, string | null>();
const existsCache = new Map<string, ResolvedFact>();
const pluginCache = new Map<string, ResolvedFact>();
let configPathDirsCache: string[] | null = null;
let configContentCache: string | null | undefined;

/** Clear all session caches (exposed for tests). */
export function clearResolveCaches(): void {
  shadowCache.clear();
  existsCache.clear();
  pluginCache.clear();
  configPathDirsCache = null;
  configContentCache = undefined;
}

/** The config file's content, read once per session; null when unreadable. */
function getConfigContent(): string | null {
  if (configContentCache !== undefined) {
    return configContentCache;
  }
  try {
    configContentCache = readFileSync(getZshrcPath(), "utf8");
  } catch {
    configContentCache = null;
  }
  return configContentCache;
}

/**
 * The raw value of a variable assigned in the config, or undefined.
 *
 * Accepts every declaration form zsh does — `export VAR=…`,
 * `typeset/declare [-flags] VAR=…`, and a plain `VAR=…` assignment,
 * which is how `ZSH_CUSTOM` is commonly set.
 */
function getConfigAssignment(variable: string): string | undefined {
  const content = getConfigContent();
  if (content === null) {
    return undefined;
  }
  const regex = new RegExp(
    `^\\s*(?:(?:export|typeset(?:\\s+-[A-Za-z]+)*|declare(?:\\s+-[A-Za-z]+)*)\\s+)?${variable}=(.*?)\\s*$`,
    "gm",
  );
  // Last assignment wins, as it would in the shell.
  let value: string | undefined;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      value = match[1];
    }
  }
  return value;
}

/**
 * Expand a leading `~`, `$HOME` or `${HOME}` in a path.
 *
 * Returns `null` when the value still contains shell syntax after
 * expansion (e.g. `${XDG_CACHE_HOME:-$HOME/.cache}` or embedded command
 * substitution) — the caller must treat that as "unknown", never as
 * "missing".
 */
export function expandUserPath(raw: string, home: string = homedir()): string | null {
  let trimmed = raw.trim();
  // Shell operands are often quoted; the quotes are not part of the path,
  // and anything after the closing quote (e.g. an inline comment that a
  // caller failed to strip) is not either.
  const quote = trimmed[0];
  if (quote === '"' || quote === "'") {
    const close = trimmed.indexOf(quote, 1);
    if (close === -1) {
      return null;
    }
    trimmed = trimmed.slice(1, close);
  } else {
    // For unquoted values, an inline comment is not part of the operand.
    const hash = trimmed.search(/\s#/);
    if (hash !== -1) {
      trimmed = trimmed.slice(0, hash).trimEnd();
    }
  }
  if (trimmed.length === 0) {
    return null;
  }

  let expanded = trimmed;
  if (expanded === "~" || expanded.startsWith("~/")) {
    expanded = home + expanded.slice(1);
  } else if (expanded.startsWith("${HOME}")) {
    expanded = home + expanded.slice("${HOME}".length);
  } else if (/^\$HOME(\/|$)/.test(expanded)) {
    // The boundary check keeps $HOMEBREW_PREFIX and friends from being
    // mangled into $HOME + "BREW_PREFIX…".
    expanded = home + expanded.slice("$HOME".length);
  }

  // Anything still carrying an unexpanded variable, command substitution,
  // or backtick is undecidable without a shell.
  if (/[$`]/.test(expanded)) {
    return null;
  }

  return expanded;
}

/** True when the path exists and is an executable regular file. */
function isExecutableFile(filePath: string): boolean {
  try {
    const stat = statSync(filePath);
    return stat.isFile() && (stat.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

/**
 * PATH directories declared in the user's config file, expanded and
 * deduplicated. Unexpandable entries are skipped. Read once per session.
 */
function getConfigPathDirs(home: string = homedir()): string[] {
  if (configPathDirsCache !== null) {
    return configPathDirsCache;
  }
  let dirs: string[] = [];
  const content = getConfigContent();
  if (content !== null) {
    dirs = parsePathEntries(content)
      .flatMap((entry) => entry.entry.split(":"))
      .map((dir) => expandUserPath(dir, home))
      .filter((dir): dir is string => dir !== null);
  }
  configPathDirsCache = dirs;
  return dirs;
}

/**
 * Find the executable a command name resolves to, scanning the
 * environment PATH plus the PATH entries declared in the config.
 *
 * Returns the full path of the first match, or `null` when nothing on
 * PATH carries that name. Used to answer "does this alias shadow a real
 * command?".
 */
export function findShadowedExecutable(
  name: string,
  envPath: string | undefined = process.env["PATH"],
  extraDirs?: string[],
  home: string = homedir(),
): string | null {
  // Path separators in a name make it a path, not a PATH lookup.
  if (name.length === 0 || name.includes("/")) {
    return null;
  }

  // The result depends on every argument, so the cache key must too —
  // a name-only key would serve stale answers to callers with custom PATHs,
  // and [] (scan nothing extra) must not collide with undefined (scan the
  // config-declared PATH dirs).
  const cacheKey = `${name}\0${envPath ?? ""}\0${extraDirs === undefined ? "<config>" : extraDirs.join(":")}\0${home}`;
  const cached = shadowCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const dirs = [...(envPath ?? "").split(":").filter(Boolean), ...(extraDirs ?? getConfigPathDirs(home))];
  const seen = new Set<string>();
  let found: string | null = null;
  for (const dir of dirs) {
    if (seen.has(dir)) {
      continue;
    }
    seen.add(dir);
    const candidate = join(dir, name);
    if (isExecutableFile(candidate)) {
      found = candidate;
      break;
    }
  }

  shadowCache.set(cacheKey, found);
  return found;
}

/**
 * Does a sourced file exist on disk?
 *
 * "unknown" when the path cannot be expanded without a shell;
 * "no" only when the expanded path definitively does not exist.
 */
export function sourceFileExists(rawPath: string, home: string = homedir()): ResolvedFact {
  const cacheKey = `${rawPath}\0${home}`;
  const cached = existsCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const expanded = expandUserPath(rawPath, home);
  let fact: ResolvedFact;
  if (expanded === null) {
    fact = "unknown";
  } else {
    try {
      statSync(expanded);
      fact = "yes";
    } catch (error) {
      // Only a definitive absence is "no". Any other failure (EACCES,
      // ELOOP, …) means the file may exist but we cannot tell — a false
      // "missing" is worse than no answer.
      const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
      fact = code === "ENOENT" || code === "ENOTDIR" ? "no" : "unknown";
    }
  }

  existsCache.set(cacheKey, fact);
  return fact;
}

/**
 * Is an Oh My Zsh plugin present in the plugins directory?
 *
 * Checks `$ZSH_CUSTOM/plugins`, `$ZSH/plugins` and `~/.oh-my-zsh/plugins`
 * (custom first, mirroring OMZ's own precedence). `ZSH` and `ZSH_CUSTOM`
 * are taken from the process environment first, then from `export`
 * declarations in the config file — Raycast's environment rarely carries
 * them, but the user's zshrc often declares them.
 *
 * When no plugins directory exists at all — e.g. a different plugin
 * manager — the answer is "unknown", not "no": absence of Oh My Zsh says
 * nothing about whether zinit or antigen installed the plugin. The same
 * applies when a declared root cannot be expanded without a shell: a
 * plugin missing from the scannable roots may live in the unscannable
 * one.
 */
export function pluginInstalled(
  name: string,
  home: string = homedir(),
  env: NodeJS.ProcessEnv = process.env,
): ResolvedFact {
  if (name.length === 0) {
    return "unknown";
  }

  const zshDecl = env["ZSH"] ?? getConfigAssignment("ZSH");
  const customDecl = env["ZSH_CUSTOM"] ?? getConfigAssignment("ZSH_CUSTOM");

  const cacheKey = `${name}\0${home}\0${zshDecl ?? ""}\0${customDecl ?? ""}`;
  const cached = pluginCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  let hasUnresolvableRoot = false;
  const resolveRoot = (decl: string | undefined, fallback: string): string => {
    if (!decl) {
      return fallback;
    }
    const expanded = expandUserPath(decl, home);
    if (expanded === null) {
      hasUnresolvableRoot = true;
      return fallback;
    }
    return expanded;
  };

  const omzRoot = resolveRoot(zshDecl, join(home, ".oh-my-zsh"));
  const customRoot = resolveRoot(customDecl, join(omzRoot, "custom"));
  const pluginRoots = [join(customRoot, "plugins"), join(omzRoot, "plugins")];

  const isDefinitiveAbsence = (error: unknown): boolean => {
    const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
    return code === "ENOENT" || code === "ENOTDIR";
  };

  let fact: ResolvedFact = "unknown";
  let sawPluginsDir = false;
  let sawUndecidable = false;
  for (const root of pluginRoots) {
    let rootIsDir = false;
    try {
      rootIsDir = statSync(root).isDirectory();
    } catch (error) {
      // A root we cannot even stat (EACCES, …) may still hold the plugin.
      if (!isDefinitiveAbsence(error)) {
        sawUndecidable = true;
      }
      continue;
    }
    if (!rootIsDir) {
      continue;
    }
    sawPluginsDir = true;
    try {
      if (statSync(join(root, name)).isDirectory()) {
        fact = "yes";
        break;
      }
    } catch (error) {
      if (!isDefinitiveAbsence(error)) {
        sawUndecidable = true;
      }
    }
  }
  if (fact !== "yes" && sawPluginsDir) {
    // A definite "no" is only safe when every declared root was actually
    // scanned and every miss was a definitive absence.
    fact = hasUnresolvableRoot || sawUndecidable ? "unknown" : "no";
  }

  pluginCache.set(cacheKey, fact);
  return fact;
}
