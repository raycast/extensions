import { open, stat } from "node:fs/promises";
import { extname } from "node:path";
import { LIMITS } from "./limits";
import { extractOfficeText, officeKindForExtension } from "./office";
import type { AnalysisContent } from "./types";

/** Raised for a file Zush deliberately will not analyze. */
export class UnsupportedFileError extends Error {}
/** Raised for a supported file that exceeds an input limit. */
export class FileTooLargeError extends Error {}

/**
 * Shared so the row that is classified before anything is read and the read
 * itself cannot drift into telling someone two different things.
 */
export const FOLDER_NOT_RENAMED = "Folders are not renamed";

const IMAGE_MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

/**
 * Extensions read as plain text. Everything here is text the model can reason
 * about; binary formats are handled by the image, PDF and Office branches.
 *
 * `.env` is deliberately absent. It is readable text, but it exists to hold
 * secrets, and reading it would put keys, passwords and connection strings in a
 * request body. Left out, it lands on "Unsupported" and never leaves the Mac.
 */
const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".text",
  ".md",
  ".markdown",
  ".rst",
  ".csv",
  ".tsv",
  ".json",
  ".jsonl",
  ".ndjson",
  ".xml",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".log",
  ".srt",
  ".vtt",
  ".tex",
  ".bib",
  ".sql",
  ".sh",
  ".bash",
  ".zsh",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".c",
  ".h",
  ".cc",
  ".cpp",
  ".hpp",
  ".cs",
  ".php",
  ".lua",
  ".r",
  ".dart",
  ".vue",
  ".svelte",
]);

/** True for a file the command offers to rename, judged by extension alone. */
export function isSupportedFile(path: string): boolean {
  const extension = extname(path).toLowerCase();
  return (
    extension === ".pdf" ||
    Object.hasOwn(IMAGE_MIME_TYPES, extension) ||
    officeKindForExtension(extension) !== null ||
    TEXT_EXTENSIONS.has(extension)
  );
}

/**
 * Reads the file at `path` and returns exactly what should be sent to the model.
 * Nothing is written back to disk and nothing is cached; the bytes live only for
 * the duration of the request.
 */
export async function readAnalysisContent(path: string): Promise<AnalysisContent> {
  const extension = extname(path).toLowerCase();
  const info = await stat(path);
  if (!info.isFile()) {
    throw new UnsupportedFileError(FOLDER_NOT_RENAMED);
  }

  const imageMimeType = IMAGE_MIME_TYPES[extension];
  if (imageMimeType) {
    if (info.size > LIMITS.maxImageSourceBytes) {
      throw new FileTooLargeError(`Over the ${megabytes(LIMITS.maxImageSourceBytes)} image limit`);
    }
    return { kind: "image", bytes: await readAll(path), mimeType: imageMimeType };
  }

  if (extension === ".pdf") {
    if (info.size > LIMITS.maxInlinePdfBytes) {
      throw new FileTooLargeError(`Over the ${megabytes(LIMITS.maxInlinePdfBytes)} PDF limit`);
    }
    return { kind: "document", bytes: await readAll(path), mimeType: "application/pdf" };
  }

  const officeKind = officeKindForExtension(extension);
  if (officeKind) {
    if (info.size > LIMITS.maxOfficeSourceBytes) {
      throw new FileTooLargeError(`Over the ${megabytes(LIMITS.maxOfficeSourceBytes)} Office limit`);
    }
    const text = extractOfficeText(await readAll(path), officeKind);
    if (!text.trim()) {
      throw new UnsupportedFileError("No readable text");
    }
    return { kind: "text", text: clampText(text) };
  }

  if (TEXT_EXTENSIONS.has(extension)) {
    const text = await readTextHead(path);
    if (!text.trim()) {
      throw new UnsupportedFileError("Empty file");
    }
    return { kind: "text", text: clampText(text) };
  }

  throw new UnsupportedFileError(`${extension || "This file type"} is not supported`);
}

async function readAll(path: string): Promise<Uint8Array> {
  const handle = await open(path, "r");
  try {
    return new Uint8Array(await handle.readFile());
  } finally {
    await handle.close();
  }
}

/** Reads only the head of a text file, so a huge log does not land in memory. */
async function readTextHead(path: string): Promise<string> {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(LIMITS.maxTextRangeBytes);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const text = buffer.subarray(0, bytesRead).toString("utf8");
    // A window that filled to the brim almost certainly stopped mid-character,
    // and the decoder renders that half sequence as U+FFFD. Only a boundary read
    // is trimmed, so a replacement character the file genuinely holds survives.
    return bytesRead === buffer.length ? text.replace(/\uFFFD+$/, "") : text;
  } finally {
    await handle.close();
  }
}

function clampText(value: string): string {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  return normalized.length > LIMITS.maxTextCharacters ? normalized.slice(0, LIMITS.maxTextCharacters) : normalized;
}

function megabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
