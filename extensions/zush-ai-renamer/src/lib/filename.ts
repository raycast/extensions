import { link, lstat, readlink, rename, symlink, unlink } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { LIMITS } from "./limits";
import type { FilenameStyle } from "./preferences";

/**
 * Turns a generated title into the filename that will actually be written, and
 * performs the rename without ever replacing an existing file.
 */
export function buildFilename(title: string, originalName: string, style: FilenameStyle): string {
  const extension = extname(originalName);
  const stem = styleStem(title, style) || styleStem(basename(originalName, extension), style) || "Untitled";
  return `${truncateToBytes(stem, LIMITS.maxFilenameBytes - Buffer.byteLength(extension))}${extension}`;
}

export type RenameOutcome = {
  /** Absolute path after the rename. */
  path: string;
  /** Filename after the rename, including the extension. */
  name: string;
  /** True when the file already had the target name and nothing was written. */
  unchanged: boolean;
};

/**
 * Renames the file to the generated title. A sibling that already owns the name
 * is never overwritten: the name is claimed first, and only a claim that
 * succeeded is renamed into.
 */
export async function renameFile(path: string, title: string, style: FilenameStyle): Promise<RenameOutcome> {
  const originalName = basename(path);
  const desired = buildFilename(title, originalName, style);
  if (normalized(desired) === normalized(originalName)) {
    return { path, name: originalName, unchanged: true };
  }

  const directory = dirname(path);

  // A name that differs only in case is the file's own name as far as a
  // case-insensitive volume is concerned, so claiming it first would collide
  // with the file itself and every attempt would be refused. Renaming straight
  // over is the only move that works — but only once the target is known to be
  // this same file, because a case-sensitive volume can hold a second file
  // under the other spelling, and renaming over that one would destroy it.
  if (normalized(desired).toLocaleLowerCase("en-US") === normalized(originalName).toLocaleLowerCase("en-US")) {
    const target = join(directory, desired);
    if (await isSameFile(path, target)) {
      await rename(path, target);
      return { path: target, name: desired, unchanged: false };
    }
    // Anything else — a distinct file already there, or nothing there at all —
    // is served correctly by the claim below, which either takes the free name
    // or steps around the occupied one.
  }

  const extension = extname(desired);
  const stem = basename(desired, extension);

  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = attempt === 1 ? desired : `${stem}${separator(style)}${attempt}${extension}`;
    const target = join(directory, candidate);

    if (await takeName(path, target)) {
      return { path: target, name: candidate, unchanged: false };
    }
  }

  throw new Error("Too many files in this folder already use that name.");
}

/** Errors that mean the volume cannot create the extra name used for a safe move. */
const UNSUPPORTED_LINK_CODES = new Set(["EPERM", "ENOTSUP", "EOPNOTSUPP", "EMLINK", "EXDEV", "ENOSYS"]);

/**
 * Moves the file to `target`, or reports that the name is already taken.
 *
 * `link` and `symlink` are what make this safe: POSIX refuses both with EEXIST
 * when the name exists, so the name is tested and taken in the same instant and
 * nothing can slip in between. A volume that cannot create the extra name is
 * rejected because Node's `rename` replaces an existing target and offers no
 * no-replace option.
 */
async function takeName(path: string, target: string): Promise<boolean> {
  const source = await lstat(path);

  try {
    // A hard link would follow a symlink and leave the file itself under the
    // new name, so a link is re-created as a link and the original removed.
    if (source.isSymbolicLink()) {
      await symlink(await readlink(path), target);
    } else {
      await link(path, target);
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code === "EEXIST") return false;
    if (!code || !UNSUPPORTED_LINK_CODES.has(code)) throw error;
    throw new Error("This file cannot be renamed safely on its current volume.", { cause: error });
  }

  // Do not remove `target` if source cleanup fails. Another process could have
  // replaced that directory entry, and deleting it would lose unrelated data.
  // Leaving the original link in place is the only safe failure mode available.
  await unlink(path);
  return true;
}

/**
 * macOS compares filenames without regard to Unicode normalization, so the
 * composed and decomposed spellings of an accented name are one file on disk.
 * Comparing the raw strings would read a model answer that merely came back in
 * the other normalization as a rename, and the claim would then collide with the
 * file itself and hand it a pointless "2".
 */
function normalized(value: string): string {
  return value.normalize("NFC");
}

/**
 * Whether `target` names the file already at `path`, rather than a second file
 * that happens to spell its name the same way.
 *
 * `lstat` rather than `stat`: a rename moves the link itself and not what it
 * points at, so two symlinks to one file have to read as two files here.
 */
async function isSameFile(path: string, target: string): Promise<boolean> {
  const source = await lstat(path);
  const existing = await lstat(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  return existing !== null && existing.dev === source.dev && existing.ino === source.ino;
}

function separator(style: FilenameStyle): string {
  if (style === "kebab") return "-";
  if (style === "snake") return "_";
  return " ";
}

function styleStem(value: string, style: FilenameStyle): string {
  const words = value
    .replace(/\p{Cc}/gu, " ")
    // Finder shows a path separator as a colon, so neither character survives.
    .replace(/[\\/:]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "";
  if (style === "kebab") return words.join("-").toLocaleLowerCase("en-US");
  if (style === "snake") return words.join("_").toLocaleLowerCase("en-US");
  // A leading dot would hide the file; a trailing one confuses the extension.
  return words
    .join(" ")
    .replace(/^\.+|\.+$/g, "")
    .trim();
}

/** macOS caps a filename at 255 bytes, not characters. */
function truncateToBytes(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value) <= maxBytes) return value;

  let result = "";
  for (const character of value) {
    if (Buffer.byteLength(result + character) > maxBytes) break;
    result += character;
  }
  return result.trim() || "Untitled";
}
