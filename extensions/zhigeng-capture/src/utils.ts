import { randomUUID } from "node:crypto";
import { writeFile, link, unlink, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

export async function getCurrentTimestamp() {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return {
    timestamp: now.toISOString(),
    date: `${part("year")}-${part("month")}-${part("day")}`,
    timezone,
  };
}

export function sanitizeFilename(input: string): string {
  return input
    .replaceAll("\0", "")
    .replace(/\.\./g, "--")
    .replace(/[\\/:*?"<>|]/g, "-")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function truncateUtf8Bytes(str: string, maxBytes: number): string {
  let bytes = 0;
  let result = "";
  for (const point of str) {
    const size = Buffer.byteLength(point, "utf-8");
    if (bytes + size > maxBytes) break;
    bytes += size;
    result += point;
  }
  return result;
}

export function buildRawFilename(
  date: string,
  captureId: string,
  title?: string,
): string {
  const suffix = `-${captureId}.md`;
  const label = sanitizeFilename(title || "") || "Capture";
  return `${date}-${truncateUtf8Bytes(label, 240 - Buffer.byteLength(date + "-" + suffix))}${suffix}`;
}

export function buildFrontmatter(fields: Record<string, string>): string {
  return [
    "---",
    ...Object.entries(fields).map(
      ([key, value]) => `${key}: ${JSON.stringify(value)}`,
    ),
    "---",
    "",
  ].join("\n");
}

export async function atomicWrite(targetPath: string, content: string) {
  const dir = dirname(targetPath);
  await mkdir(dir, { recursive: true });
  const temp = join(dir, `.tmp-${randomUUID()}.md`);
  try {
    await writeFile(temp, content, { encoding: "utf-8", flag: "wx" });
    await link(temp, targetPath);
  } finally {
    await unlink(temp).catch(() => {});
  }
}
