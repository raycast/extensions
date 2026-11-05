import { createHash } from "node:crypto";
import { z } from "zod";

export const INDEX_URL = "https://radar.cloudflare.com/security/zero-wire";
export const RSS_URL = `${INDEX_URL}/rss`;
export const ADAPTER_VERSION = 4;
export const TTL = 60 * 60 * 1000;
export const SOURCE_LICENSE_URL = "https://creativecommons.org/licenses/by-nc/4.0/";
export const SOURCE_LICENSE_NOTICE =
  "Cloudflare Zero Wire content, CC BY-NC 4.0 for noncommercial reuse under Radar's direct-download policy. " +
  "Extracted and reformatted from RSS. Cloudflare does not endorse this extension.";
const linkSchema = z.object({ title: z.string(), url: z.url(), description: z.string() });
const chronologySchema = z.object({ date: z.string().nullable(), text: z.string(), links: z.array(linkSchema) });
export const briefingSchema = z.object({
  id: z.string(),
  url: z.url(),
  title: z.string(),
  category: z.string(),
  action: z.string(),
  cves: z.array(z.string()),
  tags: z.array(z.object({ id: z.string(), name: z.string() })),
  lastChecked: z.string().nullable(),
  sourceUpdatedAt: z.string().nullable().default(null),
  fetchedAt: z.string(),
  summary: z.string(),
  why: z.string(),
  overview: z.array(z.string()),
  audience: z.array(z.string()),
  guidance: z.string(),
  steps: z.array(z.string()),
  chronology: z.array(chronologySchema),
  evidence: z.array(linkSchema),
  evidenceNotes: z.array(z.string()).default([]),
  coverage: z.array(z.string()),
  coverageLinks: z.array(linkSchema).default([]),
  assessmentPrompt: z.string().nullable(),
  completeness: z.enum(["full", "partial"]),
  provenance: z.enum(["rss", "html"]),
  hash: z.string(),
});
export type Briefing = z.infer<typeof briefingSchema>;
export const snapshotSchema = z.object({
  adapterVersion: z.number().int().nonnegative(),
  fetchedAt: z.string(),
  checkedAt: z.string(),
  etag: z.string().nullable(),
  lastModified: z.string().nullable(),
  briefings: z.array(briefingSchema),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export const databaseSchema = z.object({
  version: z.literal(1),
  revision: z.number().int().nonnegative().default(0),
  snapshot: snapshotSchema.nullable(),
  archive: z.record(z.string(), briefingSchema),
  bookmarks: z.record(z.string(), z.boolean()),
  reviewed: z.record(z.string(), z.string()),
  followed: z.record(z.string(), z.string()),
  sync: z.object({
    sourceUrl: z.string().default(""),
    lastAttempt: z.string().nullable(),
    lastSuccess: z.string().nullable(),
    error: z.string().nullable(),
    failures: z.number(),
    retryAt: z.number(),
    serverRetryAt: z.number().default(0),
  }),
});
export type Database = z.infer<typeof databaseSchema>;
export function emptyDatabase(): Database {
  return {
    version: 1,
    revision: 0,
    snapshot: null,
    archive: {},
    bookmarks: {},
    reviewed: {},
    followed: {},
    sync: {
      sourceUrl: "",
      lastAttempt: null,
      lastSuccess: null,
      error: null,
      failures: 0,
      retryAt: 0,
      serverRetryAt: 0,
    },
  };
}
export function canonicalUrl(value: string): string | null {
  try {
    const url = new URL(value, INDEX_URL);
    return url.protocol === "https:" &&
      url.origin === "https://radar.cloudflare.com" &&
      /^\/security\/zero-wire\/[a-z0-9][a-z0-9-]*\/?$/.test(url.pathname)
      ? `${url.origin}${url.pathname.replace(/\/$/, "")}`
      : null;
  } catch {
    return null;
  }
}
export function safeUrl(value: string): string | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(value, `${INDEX_URL}/`);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    for (const key of [...url.searchParams.keys()])
      if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch {
    return null;
  }
}
export function sourceDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || !Number.isFinite(Date.parse(value))) return null;
  return value.trim();
}
function semantic(value: unknown): unknown {
  if (typeof value === "string") return value.normalize("NFC").replace(/\s+/g, " ").trim();
  if (Array.isArray(value)) return value.map(semantic);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, semantic(item)]),
    );
  return value;
}
export function contentHash(b: Omit<Briefing, "hash">): string {
  const {
    category,
    action,
    title,
    cves,
    tags,
    summary,
    why,
    overview,
    audience,
    guidance,
    steps,
    chronology,
    evidence,
    evidenceNotes,
    coverage,
    coverageLinks,
    assessmentPrompt,
  } = b;
  return createHash("sha256")
    .update(
      JSON.stringify(
        semantic({
          category,
          action,
          title,
          cves: [...cves].sort(),
          tags: tags.map((t) => t.id).sort(),
          summary,
          why,
          overview,
          audience,
          guidance,
          steps,
          chronology,
          evidence,
          evidenceNotes,
          coverage,
          coverageLinks,
          assessmentPrompt,
        }),
      ),
    )
    .digest("hex");
}
export function categoryName(value: string): string {
  return value === "attention"
    ? "Needs attention"
    : value === "reference"
      ? "Reference"
      : value === "unknown"
        ? "Category unavailable"
        : value;
}
export function isUnread(b: Briefing, db: Database): boolean {
  return db.reviewed[b.id] !== b.hash;
}
export function isFollowing(b: Briefing, db: Database): boolean {
  return b.tags.some((tag) => tag.id in db.followed);
}
export type Filter = "attention" | "all" | "reference" | "following" | "unread";
function searchable(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]/gu, "");
}
export function selectBriefings(db: Database, query: string, filter: Filter, saved = false): Briefing[] {
  const entries = saved ? Object.values(db.archive).filter((b) => db.bookmarks[b.id]) : (db.snapshot?.briefings ?? []);
  const terms = query.trim().split(/\s+/).filter(Boolean).map(searchable);
  return entries
    .filter(
      (b) =>
        (filter === "all" ||
          (filter === "following"
            ? isFollowing(b, db)
            : filter === "unread"
              ? isUnread(b, db)
              : b.category === filter)) &&
        terms.every((term) =>
          [b.title, ...b.cves, ...b.tags.map((t) => t.name)].some((v) => searchable(v).includes(term)),
        ),
    )
    .sort((a, b) => {
      const rank = (v: Briefing) => (v.category === "attention" ? 0 : v.category === "reference" ? 1 : 2);
      const latest = (v: Briefing) =>
        Math.max(
          Date.parse(v.sourceUpdatedAt ?? "") || 0,
          ...v.chronology.map((c) => (c.date ? Date.parse(c.date) : 0)),
        );
      return (
        rank(a) - rank(b) ||
        latest(b) - latest(a) ||
        (Date.parse(b.lastChecked ?? "") || 0) - (Date.parse(a.lastChecked ?? "") || 0) ||
        a.id.localeCompare(b.id)
      );
    });
}
