import { z } from "zod";
import {
  canonicalUrl,
  categoryName,
  INDEX_URL,
  isFollowing,
  isUnread,
  RSS_URL,
  SOURCE_LICENSE_URL,
  SOURCE_LICENSE_NOTICE,
  selectBriefings,
  TTL,
  type Briefing,
  type Database,
} from "./model";
import { BriefingService } from "./service";

const searchInput = z.object({
  query: z.string().max(500).default(""),
  filter: z.enum(["all", "attention", "reference", "following", "unread"]).default("all"),
  savedOnly: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});
const detailInput = z.object({ briefingId: z.string().trim().min(1).max(2048) });
function freshness(db: Database) {
  const checkedAt = db.snapshot?.checkedAt ?? null;
  return {
    status: !checkedAt ? "unavailable" : db.sync.error || Date.now() - Date.parse(checkedAt) >= TTL ? "stale" : "fresh",
    feedUrl: RSS_URL,
    checkedAt,
    lastSuccessfulSync: db.sync.lastSuccess,
    error: db.sync.error,
    retryAfter: db.sync.retryAt > Date.now() ? new Date(db.sync.retryAt).toISOString() : null,
  };
}
function summary(b: Briefing, db: Database) {
  return {
    id: b.id,
    title: b.title,
    url: b.url,
    attribution: { source: "Cloudflare Zero Wire", licenseUrl: SOURCE_LICENSE_URL, notice: SOURCE_LICENSE_NOTICE },
    category: categoryName(b.category),
    sourceCategory: b.category,
    recommendedAction: b.action,
    cves: [...b.cves],
    technologies: b.tags.map((t) => ({ id: t.id, name: t.name })),
    summary: b.summary,
    sourceLastChecked: b.lastChecked,
    sourceItemDate: b.sourceUpdatedAt,
    retrievedAt: b.fetchedAt,
    completeness: b.completeness,
    provenance: b.provenance,
    sourceAvailability: db.snapshot?.briefings.some((item) => item.id === b.id) ? "in-current-feed" : "unknown",
    bookmarked: Boolean(db.bookmarks[b.id]),
    following: isFollowing(b, db),
    reviewState: isUnread(b, db) ? "unread-revision" : "reviewed-revision",
  };
}
const scope =
  "Cloudflare Zero Wire curates selected threats. A technology match indicates relevance, not confirmed exposure. Local review state is an acknowledgment, not patch or compromise status.";

export class BriefingTools {
  constructor(private readonly service: BriefingService) {}
  async search(input: z.input<typeof searchInput>) {
    const { query, filter, savedOnly, limit, offset } = searchInput.parse(input);
    const db = await this.service.sync();
    const matches = selectBriefings(db, query, filter, savedOnly);
    return {
      freshness: freshness(db),
      scope,
      total: matches.length,
      nextOffset: offset + limit < matches.length ? offset + limit : null,
      briefings: matches.slice(offset, offset + limit).map((b) => summary(b, db)),
    };
  }
  async get(input: z.input<typeof detailInput>) {
    const { briefingId } = detailInput.parse(input);
    const url = canonicalUrl(/^[a-z0-9][a-z0-9-]*$/.test(briefingId) ? `${INDEX_URL}/${briefingId}` : briefingId);
    if (!url || url === RSS_URL) throw new Error("Use a canonical briefing URL or slug returned by search-briefings.");
    let db = await this.service.sync();
    const initial = db.archive[url];
    if (!initial)
      return {
        status: db.snapshot && !db.sync.error ? "not-found" : "unavailable",
        freshness: freshness(db),
        scope,
        briefing: null,
      };
    if (initial.completeness !== "full") db = await this.service.detail(initial);
    const b = db.archive[url] ?? initial;
    return {
      status: "found",
      freshness: freshness(db),
      scope,
      briefing: {
        ...summary(b, db),
        attentionRationale: b.why,
        overview: [...b.overview],
        whoShouldInvestigate: [...b.audience],
        guidance: b.guidance,
        steps: [...b.steps],
        chronology: b.chronology.map((c) => ({
          date: c.date,
          text: c.text,
          links: c.links.map((l) => ({ title: l.title, url: l.url, description: l.description })),
        })),
        evidence: b.evidence.map((e) => ({ title: e.title, url: e.url, description: e.description })),
        evidenceNotes: [...b.evidenceNotes],
        cloudflareCoverage: [...b.coverage],
        cloudflareCoverageLinks: b.coverageLinks.map((link) => ({ title: link.title, url: link.url })),
        assessmentPrompt: b.assessmentPrompt,
        contentHash: b.hash,
      },
    };
  }
}
