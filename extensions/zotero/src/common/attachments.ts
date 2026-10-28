import { dirname, join } from "path";
import { existsSync, readFileSync, readdirSync } from "fs";
import { resolveHome } from "./paths";
import type { Attachment, RefData } from "./zoteroApi";

const basePaths = new Map<string, string | null>();

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
  const normalize = (value: string) => resolveHome(value).replace(/\/+$/, "");
  const dataDir = normalize(dirname(resolveHome(zoteroPath)));
  const cacheKey = `${profilesRoot}\0${dataDir}`;
  if (basePaths.has(cacheKey)) return basePaths.get(cacheKey) ?? null;
  const matches = new Set<string>();
  try {
    for (const profile of readdirSync(profilesRoot)) {
      const prefsPath = join(profilesRoot, profile, "prefs.js");
      if (!existsSync(prefsPath)) continue;
      try {
        const prefs = readFileSync(prefsPath, "utf8");
        const base = stringPreference(prefs, "extensions.zotero.baseAttachmentPath");
        const profileDir = stringPreference(prefs, "extensions.zotero.dataDir") || "~/Zotero";
        if (base && normalize(profileDir) === dataDir) matches.add(normalize(base));
      } catch {
        // An unreadable profile must not suppress another matching profile.
      }
    }
  } catch {
    // Missing/unavailable profiles leave linked attachments unresolved.
  }
  const base = matches.size === 1 ? [...matches][0] : null;
  basePaths.set(cacheKey, base);
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
