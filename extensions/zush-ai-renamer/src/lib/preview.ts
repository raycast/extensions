import { extname } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Raycast renders an image from a `file://` URL, in a row icon and in markdown
 * alike, so a picture can stand in for its own generic document icon.
 *
 * Only formats Raycast itself can decode are offered. A PDF or a spreadsheet
 * would need a Quick Look thumbnail generated first, which is a separate job.
 */
const PREVIEWABLE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tiff",
  ".tif",
  ".heic",
  ".heif",
  ".svg",
  ".ico",
]);

export function isPreviewable(path: string): boolean {
  return PREVIEWABLE_EXTENSIONS.has(extname(path).toLowerCase());
}

/**
 * The `file://` URL for a file Raycast can draw, or undefined for anything else.
 * `pathToFileURL` is what does the escaping: a name with a space, a `#` or a
 * non-Latin character would otherwise produce a URL pointing somewhere else.
 */
export function previewUrl(path: string): string | undefined {
  if (!isPreviewable(path)) return undefined;
  try {
    return pathToFileURL(path).href;
  } catch {
    return undefined;
  }
}
