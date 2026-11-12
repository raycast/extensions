import { ADAPTER_VERSION, RSS_URL, TTL, type Briefing, type Database } from "./model";
import { Repository } from "./storage";
import { parseFeed } from "./source";
import { getDocument, SourceError } from "./transport";

export class BriefingService {
  private pending: Promise<Database> | null = null;
  constructor(
    readonly repository: Repository,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  sync(force = false): Promise<Database> {
    if (this.pending) return this.pending;
    this.pending = this.repository
      .exclusive("sync", async () => {
        const db = await this.repository.read(),
          now = Date.now();
        const sameSource = db.sync.sourceUrl === RSS_URL;
        const currentAdapter = !db.snapshot || db.snapshot.adapterVersion === ADAPTER_VERSION;
        if (sameSource && db.sync.serverRetryAt > now) return db;
        // The hourly interval is our conservative default, not a published Cloudflare polling limit.
        // Persisted attempts also cover failures, manual refreshes, and adapter upgrades.
        if (sameSource && now - (Date.parse(db.sync.lastAttempt ?? "") || 0) < TTL) return db;
        if (
          sameSource &&
          ((!force && db.sync.retryAt > now) || (db.snapshot && now - Date.parse(db.snapshot.checkedAt) < TTL))
        )
          return db;
        const attempt = new Date(now).toISOString();
        await this.repository.update((current) => ({
          ...current,
          sync: { ...current.sync, sourceUrl: RSS_URL, lastAttempt: attempt },
        }));
        try {
          const response = await getDocument(RSS_URL, sameSource && currentAdapter ? db.snapshot : null, this.fetcher);
          if (response.status === "unchanged") {
            if (!db.snapshot) throw new Error("Zero Wire returned 304 without a cached snapshot");
            return this.repository.update((current) => ({
              ...current,
              snapshot: current.snapshot ? { ...current.snapshot, checkedAt: attempt } : null,
              sync: {
                sourceUrl: RSS_URL,
                lastAttempt: attempt,
                lastSuccess: attempt,
                error: null,
                failures: 0,
                retryAt: 0,
                serverRetryAt: 0,
              },
            }));
          }
          const briefings = parseFeed(response.body, attempt);
          if (briefings.some((b) => b.completeness !== "full" && db.archive[b.id]?.completeness === "full"))
            throw new Error(
              "Zero Wire returned less complete data. The last full snapshot is retained; open the source for current guidance.",
            );
          return this.repository.update((current) => ({
            ...current,
            snapshot: {
              adapterVersion: ADAPTER_VERSION,
              fetchedAt: attempt,
              checkedAt: attempt,
              etag: response.etag,
              lastModified: response.lastModified,
              briefings,
            },
            archive: { ...current.archive, ...Object.fromEntries(briefings.map((b) => [b.id, b])) },
            sync: {
              sourceUrl: RSS_URL,
              lastAttempt: attempt,
              lastSuccess: attempt,
              error: null,
              failures: 0,
              retryAt: 0,
              serverRetryAt: 0,
            },
          }));
        } catch (error) {
          return this.failure(error, attempt);
        }
      })
      .finally(() => {
        this.pending = null;
      });
    return this.pending;
  }
  async detail(briefing: Briefing, force = false): Promise<Database> {
    if (force || briefing.completeness !== "full") return this.sync(force);
    return this.repository.read();
  }
  private failure(error: unknown, attempt: string): Promise<Database> {
    return this.repository.update((current) => {
      const failures = current.sync.failures + 1;
      return {
        ...current,
        sync: {
          ...current.sync,
          sourceUrl: RSS_URL,
          lastAttempt: attempt,
          failures,
          error: error instanceof Error ? error.message : "Zero Wire could not be retrieved",
          serverRetryAt: error instanceof SourceError ? error.retryAt : 0,
          retryAt: Math.max(
            error instanceof SourceError ? error.retryAt : 0,
            Date.now() + Math.min(TTL * 2 ** Math.min(failures - 1, 5), 24 * TTL),
          ),
        },
      };
    });
  }
}
