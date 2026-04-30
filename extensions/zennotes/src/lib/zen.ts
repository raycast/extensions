import { Toast, open, showToast } from "@raycast/api";
import { execFile } from "node:child_process";
import * as path from "node:path";

const ZEN_STDIO_MAX_BUFFER = 20 * 1024 * 1024;

export type NoteFolder = "inbox" | "quick" | "archive" | "trash";

export interface ZenNote {
  path: string;
  title: string;
  folder: NoteFolder;
  updatedAt: number;
  tags: string[];
  hasAttachments: boolean;
  excerpt: string;
}

export interface LoadError {
  title: string;
  message: string;
}

export class ZenCliNotFoundError extends Error {
  code = "ENOENT";

  constructor() {
    super("ZenNotes CLI not found");
  }
}

export async function execZen(
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  const missingErrors: unknown[] = [];

  for (const candidate of zenCandidates()) {
    try {
      return await execFileWithClosedStdin(candidate, args);
    } catch (err) {
      if (!isMissingExecutableError(err)) throw err;
      missingErrors.push(err);
    }
  }

  if (missingErrors.length > 0) throw new ZenCliNotFoundError();
  throw new Error("ZenNotes CLI not found");
}

function execFileWithClosedStdin(
  file: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      file,
      args,
      {
        encoding: "utf8",
        maxBuffer: ZEN_STDIO_MAX_BUFFER,
      },
      (err, stdout, stderr) => {
        if (err) {
          if (isRecord(err)) err.stderr = String(stderr);
          reject(err);
          return;
        }
        resolve({ stdout: String(stdout), stderr: String(stderr) });
      },
    );
    child.stdin?.end();
  });
}

export function parseNoteList(stdout: string): ZenNote[] {
  const parsed = JSON.parse(stdout) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Expected `zen list --json` to return an array of notes.");
  }
  return parsed.map(parseNote).filter((note): note is ZenNote => note !== null);
}

export function parseNote(value: unknown): ZenNote | null {
  if (!isRecord(value)) return null;
  if (typeof value.path !== "string" || !value.path.trim()) return null;

  const title =
    typeof value.title === "string" && value.title.trim()
      ? value.title
      : titleFromPath(value.path);
  const folder = parseFolder(value.folder);
  const updatedAt =
    typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
      ? value.updatedAt
      : 0;
  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag): tag is string => typeof tag === "string")
    : [];

  return {
    path: value.path,
    title,
    folder,
    updatedAt,
    tags,
    hasAttachments: value.hasAttachments === true,
    excerpt: typeof value.excerpt === "string" ? value.excerpt : "",
  };
}

export async function loadVaultRoot(): Promise<string | null> {
  const { stdout } = await execZen(["vault", "info", "--json"]);
  const parsed = JSON.parse(String(stdout)) as unknown;
  if (!isRecord(parsed)) return null;
  return typeof parsed.vaultRoot === "string" && parsed.vaultRoot.trim()
    ? parsed.vaultRoot
    : null;
}

export async function openNoteInZenNotes(
  note: Pick<ZenNote, "path" | "title">,
): Promise<void> {
  await openNoteWithDeepLink(note, "open", {
    openingTitle: "Opening note",
    successTitle: "Opened in ZenNotes",
    failureTitle: "Could not open ZenNotes",
  });
}

export async function openNoteInFloatingWindow(
  note: Pick<ZenNote, "path" | "title">,
): Promise<void> {
  await openNoteWithDeepLink(note, "open-window", {
    openingTitle: "Opening floating window",
    successTitle: "Opened floating window",
    failureTitle: "Could not open floating window",
  });
}

async function openNoteWithDeepLink(
  note: Pick<ZenNote, "path" | "title">,
  action: "open" | "open-window",
  messages: {
    openingTitle: string;
    successTitle: string;
    failureTitle: string;
  },
): Promise<void> {
  await showToast({
    style: Toast.Style.Animated,
    title: messages.openingTitle,
    message: note.title,
  });

  try {
    await open(`zennotes://${action}?path=${encodeURIComponent(note.path)}`);
    await showToast({
      style: Toast.Style.Success,
      title: messages.successTitle,
      message: note.title,
    });
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: messages.failureTitle,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export function absoluteNotePath(
  vaultRoot: string | null,
  relPath: string,
): string | null {
  if (!vaultRoot) return null;
  const segments = relPath.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "..")) return null;
  return path.join(vaultRoot, ...segments);
}

export function titleFromPath(relPath: string): string {
  const basename = path.posix.basename(relPath);
  return basename.replace(/\.md$/i, "") || relPath;
}

export function toLoadError(err: unknown): LoadError {
  if (err instanceof ZenCliNotFoundError || isMissingExecutableError(err)) {
    return {
      title: "ZenNotes CLI not found",
      message:
        "Install the zen command from ZenNotes Settings -> CLI, then run `zen list` in Terminal to verify it.",
    };
  }

  const stderr =
    isRecord(err) && typeof err.stderr === "string" ? err.stderr.trim() : "";
  const message =
    stderr.replace(/^zen:\s*/i, "") ||
    (err instanceof Error ? err.message : String(err));
  return {
    title: "Could not load notes",
    message,
  };
}

export function cliSetupCopyActionContent(): string {
  return "Open ZenNotes -> Settings -> CLI, install the zen command, then run `zen list` in Terminal to verify it.";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function zenCandidates(): string[] {
  const candidates = ["zen"];
  const home = process.env.HOME;
  if (home) {
    candidates.push(path.join(home, ".local", "bin", "zen"));
    candidates.push(path.join(home, "bin", "zen"));
  }
  candidates.push("/opt/homebrew/bin/zen");
  candidates.push("/usr/local/bin/zen");
  return Array.from(new Set(candidates));
}

function parseFolder(value: unknown): NoteFolder {
  return value === "quick" || value === "archive" || value === "trash"
    ? value
    : "inbox";
}

function isMissingExecutableError(err: unknown): boolean {
  return isRecord(err) && err.code === "ENOENT";
}
