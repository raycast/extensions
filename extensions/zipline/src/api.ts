import { showToast, Toast } from "@raycast/api";
import * as fs from "node:fs";
import * as path from "node:path";
import { getServerUrl, getPreferences } from "./preferences";

export interface UploadResponse {
  files: Array<{ id: string; name: string; type: string; url: string }>;
  deletesAt?: string;
}

export interface ShortenResponse {
  url: string;
}

export interface UploadOptions {
  expiry?: string;
  format?: string;
  filename?: string;
  password?: string;
  maxViews?: number;
  originalName?: boolean;
  folder?: string;
  domain?: string;
  fileExtension?: string;
  compressionPercent?: number;
}

export interface ShortenOptions {
  vanity?: string;
  maxViews?: number;
}

class ZiplineApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZiplineApiError";
  }
}

function readFileAsBlob(filePath: string, nameForMime?: string): Blob {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(nameForMime || filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".json": "application/json",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".txt": "text/plain",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
  };
  const mimeType = mimeMap[ext] || "application/octet-stream";
  return new Blob([new Uint8Array(buffer)], { type: mimeType });
}

function buildUploadHeaders(options?: UploadOptions): Record<string, string> {
  const prefs = getPreferences();
  const headers: Record<string, string> = { Authorization: prefs.apiToken };

  const expiry = options?.expiry || prefs.defaultExpiry;
  if (expiry && expiry !== "never") {
    headers["x-zipline-deletes-at"] = expiry;
  }

  const format = options?.format || prefs.filenameFormat;
  if (format && format !== "random") {
    headers["x-zipline-format"] = format;
  }

  if (options?.filename) headers["x-zipline-filename"] = options.filename;
  if (options?.password) headers["x-zipline-password"] = options.password;
  if (options?.maxViews)
    headers["x-zipline-max-views"] = String(options.maxViews);
  if (options?.originalName) headers["x-zipline-original-name"] = "true";
  if (options?.folder) headers["x-zipline-folder"] = options.folder;
  else if (prefs.defaultFolder)
    headers["x-zipline-folder"] = prefs.defaultFolder;
  if (options?.domain) headers["x-zipline-domain"] = options.domain;
  if (options?.fileExtension)
    headers["x-zipline-file-extension"] = options.fileExtension;
  if (options?.compressionPercent !== undefined) {
    headers["x-zipline-image-compression-percent"] = String(
      options.compressionPercent,
    );
  }

  return headers;
}

export async function uploadFiles(
  files: Array<{ path: string; name: string }>,
  options?: UploadOptions,
): Promise<UploadResponse> {
  const baseUrl = getServerUrl();
  const headers = buildUploadHeaders(options);

  const formData = new FormData();
  for (const file of files) {
    const blob = readFileAsBlob(file.path, file.name);
    formData.append("file", blob, file.name);
  }

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new ZiplineApiError(
      `Upload failed (${response.status}): ${errorText}`,
    );
  }

  return (await response.json()) as UploadResponse;
}

export async function shortenUrl(
  url: string,
  options?: ShortenOptions,
): Promise<ShortenResponse> {
  const baseUrl = getServerUrl();
  const prefs = getPreferences();

  const headers: Record<string, string> = {
    Authorization: prefs.apiToken,
    "Content-Type": "application/json",
  };

  if (options?.maxViews) {
    headers["X-Zipline-Max-Views"] = String(options.maxViews);
  }

  const body: { destination: string; vanity?: string } = { destination: url };
  if (options?.vanity) {
    body.vanity = options.vanity;
  }

  const response = await fetch(`${baseUrl}/api/user/urls`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new ZiplineApiError(
      `Shorten failed (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as { url: string };
  return { url: data.url };
}

export async function handleApiError(
  error: unknown,
  action: string,
): Promise<void> {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  await showToast({
    style: Toast.Style.Failure,
    title: `${action} failed`,
    message,
  });
}
