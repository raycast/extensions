import { dirname, join } from "path";
import { resolveHome } from "./paths";
import type { RefData } from "./zoteroApi";

// Resolve the on-disk path of a reference's PDF attachment. Imported files live
// under <data dir>/storage/<attachment key>/<filename> and are recorded as
// "storage:<filename>"; linked files already carry an absolute path.
export function resolveAttachmentPath(item: RefData, zoteroPath: string): string | null {
  if (!item.attachment?.path || !item.attachment?.key) return null;
  const attachmentPath = item.attachment.path;
  if (!attachmentPath.startsWith("storage:")) {
    return attachmentPath;
  }
  const filename = attachmentPath.slice("storage:".length);
  const expandedZoteroPath = resolveHome(zoteroPath);
  return join(dirname(expandedZoteroPath), "storage", item.attachment.key, filename);
}
