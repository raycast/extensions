import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getPreferences } from "./preferences.js";
import {
  atomicWrite,
  buildFrontmatter,
  buildRawFilename,
  getCurrentTimestamp,
} from "./utils.js";

export interface RawCaptureParams {
  type: "note" | "todo";
  captureId: string;
  title: string;
  project?: string;
  body: string;
  scheduled?: string;
  due?: string;
  priority?: "high" | "normal" | "low";
  legacyEventDate?: string;
}

function validDate(value?: string) {
  if (!value) return;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Date must be a valid YYYY-MM-DD");
  }
}

async function safeDirectory(path: string, create = false) {
  if (create) await mkdir(path, { recursive: true });
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new Error("Raw draft directory must not be a symlink or file");
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" && !create)
      return false;
    throw error;
  }
}

export async function captureRaw(params: RawCaptureParams) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,80}$/.test(params.captureId))
    throw new Error("Invalid capture ID");
  if (!params.body.trim()) throw new Error("Body cannot be empty");
  if (!["note", "todo"].includes(params.type))
    throw new Error("Unsupported capture type");
  validDate(params.scheduled);
  validDate(params.due);
  validDate(params.legacyEventDate);
  const title =
    params.title.trim() ||
    (params.type === "todo"
      ? params.body
          .split("\n")
          .find((line) => line.trim())!
          .trim()
      : "");
  if (params.type === "todo" && title.length > 600)
    throw new Error(
      "Todo title cannot exceed 600 characters; please provide a shorter title",
    );
  const fields: Record<string, string> = {
    capture_schema: "zhigeng-capture/v1",
    capture_type: params.type,
    capture_id: params.captureId,
  };
  if (title) fields.title = title;
  if (params.project) fields.project = params.project;
  if (params.type === "todo") {
    fields.priority = params.priority || "normal";
    if (!["normal", "high", "low"].includes(fields.priority))
      throw new Error("Invalid priority");
    if (params.scheduled) fields.scheduled = params.scheduled;
    if (params.due) fields.due = params.due;
  }
  if (params.legacyEventDate) fields.event_date = params.legacyEventDate;
  // Clock-independent fingerprint permits retry after rollover or an archive move.
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([fields, params.body]))
    .digest("hex");
  const vault = await realpath(getPreferences().vaultPath);
  const raw = join(vault, "_raw");
  await safeDirectory(raw, true);
  const archive = join(raw, "_archived");
  const directories = [raw];
  if (await safeDirectory(archive)) directories.push(archive);
  const suffix = `-${params.captureId}.md`;
  const matches: string[] = [];
  for (const directory of directories) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.endsWith(suffix) && entry.isFile())
        matches.push(join(directory, entry.name));
    }
  }
  if (matches.length > 1)
    throw new Error(
      "Multiple raw drafts found for the same capture ID; please verify before retrying",
    );
  if (matches.length) {
    const filePath = matches[0];
    const existing = await readFile(filePath, "utf-8");
    const closing = existing.indexOf("\n---\n", 4);
    const header = existing.slice(0, closing);
    if (
      closing < 0 ||
      !header.includes(`capture_id: ${JSON.stringify(params.captureId)}\n`) ||
      !header.includes(`payload_sha256: ${JSON.stringify(fingerprint)}`) ||
      !Object.entries(fields).every(([key, value]) =>
        header.split("\n").includes(`${key}: ${JSON.stringify(value)}`),
      ) ||
      existing.slice(closing + 5) !== params.body + "\n"
    ) {
      throw new Error(
        "An existing draft with this capture ID has different content; not overwriting",
      );
    }
    return { success: true as const, filePath };
  }
  const ts = await getCurrentTimestamp();
  fields.capture_time = ts.timestamp;
  fields.capture_timezone = ts.timezone;
  fields.payload_sha256 = fingerprint;
  const content = buildFrontmatter(fields) + params.body + "\n";
  const filePath = join(
    raw,
    buildRawFilename(ts.date, params.captureId, title),
  );
  try {
    await atomicWrite(filePath, content);
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code !== "EEXIST" ||
      (await readFile(filePath, "utf-8")) !== content
    )
      throw error;
  }
  return { success: true as const, filePath };
}
