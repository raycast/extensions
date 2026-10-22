import { dirname, join } from "path";
import { resolveHome } from "./paths";
import type { Attachment, RefData } from "./zoteroApi";

// Resolve the on-disk path of a single pdf attachment. Imported files live
// under <data dir>/storage/<attachment key>/<filename> and are recorded as
// "storage:<filename>"; linked files already carry an absolute path.
export function attachmentPath(att: Attachment, zoteroPath: string): string | null {
  if (!att.path || !att.key) return null;
  if (!att.path.startsWith("storage:")) {
    return att.path;
  }
  const filename = att.path.slice("storage:".length);
  const expandedZoteroPath = resolveHome(zoteroPath);
  return join(dirname(expandedZoteroPath), "storage", att.key, filename);
}

// Resolve the on-disk path of a reference's primary pdf attachment.
export function resolveAttachmentPath(item: RefData, zoteroPath: string): string | null {
  return item.attachment ? attachmentPath(item.attachment, zoteroPath) : null;
}

// Every pdf attachment of a reference except the primary (the first, oldest
// one, which the database query returns first). Empty for entries with a
// single pdf and for cache entries built before multi-attachment support.
export function secondaryAttachments(item: RefData): Attachment[] {
  const all = item.attachments;
  if (!all) return [];
  return all.slice(1);
}
