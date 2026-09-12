import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { showToast, Toast } from "@raycast/api";

export const execFileAsync = promisify(execFile);

const ZLIB_PATH_CANDIDATES = ["/opt/homebrew/bin/zlib", "/usr/local/bin/zlib"];

export function resolveZlibPath(configuredPath: string): string {
  if (configuredPath) return configuredPath;
  return ZLIB_PATH_CANDIDATES.find((path) => existsSync(path)) ?? "zlib";
}

export function truncate(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function buildExecEnv(zlibDomain?: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (zlibDomain) env.ZLIB_DOMAIN = zlibDomain;
  return env;
}

export interface Book {
  id: string;
  hash?: string;
  url: string;
  name: string;
  authors?: string[];
  year?: string;
  extension?: string;
  size?: string;
  rating?: string;
}

export interface QueueItem extends Book {
  downloaded: boolean;
  queuedAt: number;
}

export const QUEUE_STORAGE_KEY = "download-queue";

export async function downloadBook(
  zlibPath: string,
  book: Pick<Book, "id">,
  downloadDir: string,
  execEnv: NodeJS.ProcessEnv,
): Promise<void> {
  await execFileAsync(zlibPath, ["download", book.id, "--dir", downloadDir], {
    env: execEnv,
  });
}

export interface BulkDownloadResult {
  book: Book;
  success: boolean;
  error?: string;
}

/**
 * Downloads books one at a time (sequential, not parallel — kinder to
 * Z-Library's rate limits) while keeping a single progress toast updated.
 * Calls `onEachResult` right after each book settles, so callers can persist
 * per-item state (e.g. marking a queue entry as downloaded) incrementally
 * rather than only at the very end.
 */
export async function runBulkDownload(
  books: Book[],
  options: {
    zlibPath: string;
    downloadDir: string;
    execEnv: NodeJS.ProcessEnv;
    onEachResult?: (result: BulkDownloadResult) => void;
  },
): Promise<BulkDownloadResult[]> {
  const { zlibPath, downloadDir, execEnv, onEachResult } = options;
  const results: BulkDownloadResult[] = [];

  if (books.length === 0) return results;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Downloading 1 of ${books.length}`,
    message: truncate(books[0].name),
  });

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    toast.title = `Downloading ${i + 1} of ${books.length}`;
    toast.message = truncate(book.name);

    let result: BulkDownloadResult;
    try {
      await downloadBook(zlibPath, book, downloadDir, execEnv);
      result = { book, success: true };
    } catch (err) {
      result = {
        book,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    results.push(result);
    onEachResult?.(result);
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.length - succeeded;

  if (failed === 0) {
    toast.style = Toast.Style.Success;
    toast.title = `Downloaded ${succeeded} book${succeeded === 1 ? "" : "s"}`;
    toast.message = "";
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = `Downloaded ${succeeded}, failed ${failed}`;
    toast.message = results.find((r) => !r.success)?.error ?? "";
  }

  return results;
}
