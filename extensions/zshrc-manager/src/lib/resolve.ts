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

/** Clear all session caches (exposed for tests). */
export function clearResolveCaches(): void {
  shadowCache.clear();
  existsCache.clear();
  pluginCache.clear();
  configPathDirsCache = null;
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
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  let expanded = trimmed;
  if (expanded === "~" || expanded.startsWith("~/")) {
    expanded = home + expanded.slice(1);
  } else if (expanded.startsWith("${HOME}")) {
    expanded = home + expanded.slice("${HOME}".length);
  } else if (expanded.startsWith("$HOME")) {
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
  try {
    const content = readFileSync(getZshrcPath(), "utf8");
    dirs = parsePathEntries(content)
      .flatMap((entry) => entry.entry.split(":"))
      .map((dir) => expandUserPath(dir, home))
      .filter((dir): dir is string => dir !== null);
  } catch {
    // Unreadable config: fall back to the environment PATH alone.
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
 * (custom first, mirroring OMZ's own precedence). When no plugins
 * directory exists at all — e.g. a different plugin manager — the answer
 * is "unknown", not "no": absence of Oh My Zsh says nothing about
 * whether zinit or antigen installed the plugin.
 */
export function pluginInstalled(
  name: string,
  home: string = homedir(),
  env: NodeJS.ProcessEnv = process.env,
): ResolvedFact {
  if (name.length === 0) {
    return "unknown";
  }

  const cacheKey = `${name}\0${home}\0${env["ZSH"] ?? ""}\0${env["ZSH_CUSTOM"] ?? ""}`;
  const cached = pluginCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const omzRoot = (env["ZSH"] && expandUserPath(env["ZSH"], home)) || join(home, ".oh-my-zsh");
  const customRoot = (env["ZSH_CUSTOM"] && expandUserPath(env["ZSH_CUSTOM"], home)) || join(omzRoot, "custom");
  const pluginRoots = [join(customRoot, "plugins"), join(omzRoot, "plugins")];

  let fact: ResolvedFact = "unknown";
  let sawPluginsDir = false;
  for (const root of pluginRoots) {
    try {
      if (!statSync(root).isDirectory()) {
        continue;
      }
      sawPluginsDir = true;
      if (statSync(join(root, name)).isDirectory()) {
        fact = "yes";
        break;
      }
    } catch {
      // Root or plugin directory missing — keep scanning.
    }
  }
  if (fact !== "yes" && sawPluginsDir) {
    fact = "no";
  }

  pluginCache.set(cacheKey, fact);
  return fact;
}
