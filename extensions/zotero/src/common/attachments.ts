import { dirname, join, resolve } from "path";
import { existsSync, readFileSync, readdirSync, realpathSync } from "fs";
import { resolveHome } from "./paths";
import type { Attachment, RefData } from "./zoteroApi";

const basePaths = new Map<string, { base: string | null; expiresAt: number }>();
const BASE_PATH_CACHE_MS = 5_000;

function normalizeDirectory(value: string): string {
  const expanded = resolve(resolveHome(value));
  try {
    return realpathSync(expanded);
  } catch {
    // Missing/unavailable directories can still match their configured paths.
    return expanded;
  }
}

function stringPreference(prefs: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = prefs.match(new RegExp(`user_pref\\("${escaped}",\\s*("(?:\\\\.|[^"\\\\])*")\\);`));
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as string;
  } catch {
    return null;
  }
}

// Resolve only a matching data directory (or the default data directory).
// Picking the first unrelated profile can open the wrong linked document.
export function getLinkedAttachmentBasePath(
  zoteroPath: string,
  profilesRoot = join(process.env.HOME || "", "Library", "Application Support", "Zotero", "Profiles"),
): string | null {
  const dataDir = normalizeDirectory(dirname(resolveHome(zoteroPath)));
  const cacheKey = `${profilesRoot}\0${dataDir}`;
  const cached = basePaths.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.base;
  const matches = new Set<string>();
  try {
    for (const profile of readdirSync(profilesRoot)) {
      const prefsPath = join(profilesRoot, profile, "prefs.js");
      if (!existsSync(prefsPath)) continue;
      try {
        const prefs = readFileSync(prefsPath, "utf8");
        const base = stringPreference(prefs, "extensions.zotero.baseAttachmentPath");
        const profileDir = stringPreference(prefs, "extensions.zotero.dataDir") || "~/Zotero";
        if (base && normalizeDirectory(profileDir) === dataDir) matches.add(normalizeDirectory(base));
      } catch {
        // An unreadable profile must not suppress another matching profile.
      }
    }
  } catch {
    // Missing/unavailable profiles leave linked attachments unresolved.
  }
  const base = matches.size === 1 ? [...matches][0] : null;
  // Bound both successful and unavailable results so later searches recover
  // from edited settings or temporary profile read failures.
  basePaths.set(cacheKey, { base, expiresAt: Date.now() + BASE_PATH_CACHE_MS });
  return base;
}

// Resolve the on-disk path of a single pdf attachment. Imported files live
// under <data dir>/storage/<attachment key>/<filename> and are recorded as
// "storage:<filename>". Linked files can be absolute or relative to the
// configured profile's linked-attachment base directory ("attachments:").
export function attachmentPath(att: Attachment, zoteroPath: string, linkedBasePath?: string | null): string | null {
  if (!att.path || !att.key) return null;
  if (att.path.startsWith("attachments:")) {
    const base = linkedBasePath === undefined ? getLinkedAttachmentBasePath(zoteroPath) : linkedBasePath;
    if (!base) return null;
    const relativePath = att.path.slice("attachments:".length).replace(/^[/\\]+/, "");
    return join(resolveHome(base), relativePath);
  }
  if (!att.path.startsWith("storage:")) {
    return att.path;
  }
  const filename = att.path.slice("storage:".length);
  const expandedZoteroPath = resolveHome(zoteroPath);
  return join(dirname(expandedZoteroPath), "storage", att.key, filename);
}

// Resolve the on-disk path of a reference's primary pdf attachment.
export function resolveAttachmentPath(
  item: RefData,
  zoteroPath: string,
  linkedBasePath?: string | null,
): string | null {
  return item.attachment ? attachmentPath(item.attachment, zoteroPath, linkedBasePath) : null;
}

// Every pdf attachment of a reference except the primary (the first, oldest
// one, which the database query returns first). Empty for entries with a
// single pdf and for cache entries built before multi-attachment support.
export function secondaryAttachments(item: RefData): Attachment[] {
  const all = item.attachments;
  if (!all) return [];
  return all.slice(1);
}
