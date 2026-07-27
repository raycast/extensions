import { extname } from "node:path";

/**
 * Links to the Zush macOS app and the file kinds it covers. The extension works
 * fully on its own; this is only an optional hand-off for files the extension
 * deliberately does not analyze. See `zush-app.ts` for launching the app.
 */
export const ZUSH_WEBSITE = "https://zushapp.com";

/**
 * Stamps campaign parameters on a Zush link so the site can tell where a visit
 * came from. Only zushapp.com is ever rewritten, and no data leaves the machine
 * until the user actually opens the link.
 */
export function withZushUtm(url: string, content: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "zushapp.com" && parsed.hostname !== "www.zushapp.com") {
      return url;
    }
    parsed.searchParams.set("utm_source", "raycast");
    parsed.searchParams.set("utm_medium", "extension");
    parsed.searchParams.set("utm_content", content);
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * File kinds the Zush app analyzes but this extension does not: RAW captures,
 * video, audio, and the image formats that need decoding before upload.
 * Taken from the app's declared document types and `Config.swift`.
 */
const ZUSH_ONLY_EXTENSIONS = new Set([
  // RAW captures
  ".cr2",
  ".cr3",
  ".nef",
  ".arw",
  ".dng",
  ".orf",
  ".raf",
  ".rw2",
  ".pef",
  ".srw",
  ".sr2",
  ".raw",
  // Images the extension cannot upload as-is
  ".avif",
  ".gif",
  ".tiff",
  ".tif",
  ".bmp",
  ".dib",
  ".ico",
  ".svg",
  ".heics",
  // Video
  ".mp4",
  ".mov",
  ".m4v",
  ".3gp",
  ".mpeg",
  ".mpg",
  ".avi",
  ".mkv",
  ".webm",
  // Audio
  ".mp3",
  ".m4a",
  ".wav",
  ".aiff",
  ".aif",
  ".flac",
  ".ogg",
  ".opus",
  ".caf",
  // Documents the extension does not open
  ".doc",
  ".xls",
  ".ppt",
  ".rtf",
  ".odt",
  ".ods",
  ".odp",
  ".pages",
  ".numbers",
  ".key",
  ".epub",
]);

/** True when the Zush app handles a file that this extension skipped. */
export function zushAppHandles(path: string): boolean {
  return ZUSH_ONLY_EXTENSIONS.has(extname(path).toLowerCase());
}
