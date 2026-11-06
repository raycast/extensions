import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Repository } from "../src/lib/storage";
import { BriefingService } from "../src/lib/service";
import { getDocument, retryAfter } from "../src/lib/transport";
import { RSS_URL, TTL, isUnread } from "../src/lib/model";
import { feedXml, records, rssResponse } from "./helpers";

async function temporary(run: (repository: Repository) => Promise<void>) {
  const path = await mkdtemp(join(tmpdir(), "zero-wire-service-"));
  try {
    await run(new Repository(path));
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}
async function expireCache(repo: Repository) {
  await repo.update((db) => ({
    ...db,
    snapshot: db.snapshot ? { ...db.snapshot, checkedAt: new Date(Date.now() - TTL).toISOString() } : null,
    sync: { ...db.sync, lastAttempt: new Date(Date.now() - TTL).toISOString(), retryAt: 0 },
  }));
}
test("sync deduplicates requests, uses TTL and validators, and 304 retains fetched time", async () =>
  temporary(async (repo) => {
    const html = await feedXml(await records());
    let requests = 0;
    const fetcher: typeof fetch = async (_url, options) => {
      requests++;
      if (requests === 1)
        return rssResponse(html, { etag: '"revision-1"', "last-modified": "Wed, 04 Nov 2026 00:00:00 GMT" });
      assert.equal(new Headers(options?.headers).get("if-none-match"), '"revision-1"');
      return new Response(null, { status: 304 });
    };
    const service = new BriefingService(repo, fetcher);
    const [first, duplicate] = await Promise.all([service.sync(), service.sync()]);
    assert.deepEqual(first, duplicate);
    assert.equal(requests, 1);
    await service.sync();
    assert.equal(requests, 1);
    await service.sync(true);
    assert.equal(requests, 1);
    await expireCache(repo);
    const unchanged = await service.sync(true);
    assert.equal(requests, 2);
    assert.equal(first.snapshot?.fetchedAt, unchanged.snapshot?.fetchedAt);
    assert.equal(unchanged.sync.error, null);
  }));
test("failures retain full cache and user state, honor Retry-After, and never create empty feed", async () =>
  temporary(async (repo) => {
    const html = await feedXml(await records());
    const service = new BriefingService(repo, async () => rssResponse(html));
    const initial = await service.sync();
    const b = initial.snapshot!.briefings[0];
    await repo.update((db) => ({ ...db, bookmarks: { [b.id]: true }, reviewed: { [b.id]: b.hash } }));
    let calls = 0;
    const blocked = new BriefingService(repo, async () => {
      calls++;
      return new Response("", { status: 429, headers: { "retry-after": "7200" } });
    });
    await expireCache(repo);
    const failed = await blocked.sync(true);
    assert.equal(failed.snapshot?.briefings.length, 3);
    assert.equal(failed.bookmarks[b.id], true);
    assert.equal(isUnread(b, failed), false);
    assert.ok(failed.sync.retryAt >= Date.now() + 7190000);
    await blocked.sync(true);
    assert.equal(calls, 1);
    assert.match(failed.sync.error!, /429/);
  }));
test("malformed pages, downgrade and offline errors preserve last full snapshot", async () =>
  temporary(async (repo) => {
    await new BriefingService(repo, async () => rssResponse(await feedXml(await records()))).sync();
    for (const body of [
      "<html><p>Not a briefing</p></html>",
      '<section><article><h3>Partial</h3><a href="/security/zero-wire/synthetic-php">Read</a></article></section>',
      "<title>Just a moment...</title>",
    ]) {
      await expireCache(repo);
      const initial = await repo.read();
      const failed = await new BriefingService(repo, async () => rssResponse(body)).sync(true);
      assert.deepEqual(failed.snapshot, initial.snapshot);
      assert.ok(failed.sync.error);
    }
    await expireCache(repo);
    const initial = await repo.read();
    const offline = await new BriefingService(repo, async () => {
      throw new TypeError("Offline");
    }).sync(true);
    assert.deepEqual(offline.snapshot, initial.snapshot);
    assert.match(offline.sync.error!, /Offline/);
  }));
test("explicit review is tied to displayed content, revisions recur once and vanished bookmarks remain", async () =>
  temporary(async (repo) => {
    const entries = await records();
    await new BriefingService(repo, async () => rssResponse(await feedXml(entries))).sync();
    const b = (await repo.read()).snapshot!.briefings[0];
    await repo.update((db) => ({ ...db, reviewed: { [b.id]: b.hash }, bookmarks: { [b.id]: true } }));
    const revisedEntries = structuredClone(entries) as Record<string, unknown>[];
    revisedEntries[0].whatToDo = "A meaningful guidance revision.";
    const service = new BriefingService(repo, async () => rssResponse(await feedXml(revisedEntries)));
    await expireCache(repo);
    const revised = await service.sync(true),
      updated = revised.snapshot!.briefings[0];
    assert.equal(isUnread(updated, revised), true);
    const again = await service.sync(true);
    assert.equal(again.snapshot!.briefings[0].hash, updated.hash);
    await repo.update((db) => ({ ...db, reviewed: { [b.id]: updated.hash } }));
    assert.equal(isUnread(updated, await repo.read()), false);
    await expireCache(repo);
    await new BriefingService(repo, async () => rssResponse(await feedXml(entries.slice(1)))).sync(true);
    assert.equal((await repo.read()).archive[b.id].id, b.id);
    assert.equal((await repo.read()).bookmarks[b.id], true);
  }));
test("transport bounds size and refuses redirects, non-HTML, failures and timeout", async () => {
  assert.equal(retryAfter("60", 1000), 61000);
  assert.equal(retryAfter("bad", 1000), 0);
  assert.equal(retryAfter("Wed, 04 Nov 2026 18:00:00 GMT", 0), Date.parse("2026-11-04T18:00:00Z"));
  for (const status of [403, 429, 500, 503])
    await assert.rejects(getDocument(RSS_URL, null, async () => new Response(null, { status })));
  await assert.rejects(
    getDocument(
      "https://example.com",
      null,
      async () => new Response("{}", { headers: { "content-type": "application/json" } }),
    ),
    /content type/,
  );
  await assert.rejects(
    getDocument(RSS_URL, null, async () => rssResponse("", { "content-length": String(6 * 1024 * 1024) })),
    /5 MiB/,
  );
  await assert.rejects(
    getDocument(RSS_URL, null, async () => rssResponse("x".repeat(5 * 1024 * 1024 + 1))),
    /5 MiB/,
  );
  await assert.rejects(
    getDocument(RSS_URL, null, async (_url, options) => {
      assert.equal(options?.redirect, "error");
      assert.ok(options?.signal);
      throw new DOMException("Timed out", "TimeoutError");
    }),
    /Timed out/,
  );
});

test("manual retry can recover ordinary failures while server cooldown survives adapter changes", async () =>
  temporary(async (repo) => {
    const service = new BriefingService(repo, async () => rssResponse(await feedXml(await records())));
    await service.sync();
    await expireCache(repo);
    await new BriefingService(repo, async () => {
      throw new TypeError("Offline");
    }).sync(true);
    assert.equal((await service.sync(true)).sync.error, "Offline");
    await expireCache(repo);
    assert.equal((await service.sync(true)).sync.error, null);
    await expireCache(repo);
    await new BriefingService(
      repo,
      async () => new Response(null, { status: 429, headers: { "retry-after": "3600" } }),
    ).sync(true);
    await repo.update((db) => ({ ...db, snapshot: db.snapshot ? { ...db.snapshot, adapterVersion: 0 } : null }));
    const cooled = await new BriefingService(repo, async () => {
      throw new Error("Should not request during cooldown");
    }).sync(true);
    assert.match(cooled.sync.error!, /429/);
  }));

test("hourly request limit survives concurrent services, manual detail refresh, restart and adapter upgrades", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-05T00:00:00Z") });
  await temporary(async (repo) => {
    const xml = await feedXml(await records());
    let requests = 0;
    const fetcher: typeof fetch = async (url) => {
      assert.equal(url, RSS_URL);
      requests++;
      // The attempt is committed before network access, even without a snapshot.
      assert.equal((await repo.read()).sync.lastAttempt, new Date().toISOString());
      return rssResponse(xml);
    };
    const service = new BriefingService(repo, fetcher);
    const other = new BriefingService(repo, fetcher);
    await Promise.all([service.sync(), other.sync(true)]);
    assert.equal(requests, 1);
    const briefing = (await repo.read()).snapshot!.briefings[0];
    await repo.update((db) => ({ ...db, snapshot: db.snapshot ? { ...db.snapshot, adapterVersion: 0 } : null }));
    await new BriefingService(repo, fetcher).sync(true);
    await service.detail({ ...briefing, provenance: "html", completeness: "partial" }, true);
    t.mock.timers.tick(TTL - 1);
    await service.sync(true);
    assert.equal(requests, 1);
    t.mock.timers.tick(1);
    await service.detail({ ...briefing, completeness: "partial" });
    assert.equal(requests, 2);
  });
});

test("failed first requests and parser errors cannot be retried inside the hourly interval", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-05T00:00:00Z") });
  await temporary(async (repo) => {
    let requests = 0;
    const fetcher: typeof fetch = async () => {
      requests++;
      if (requests === 1) throw new Error("Offline");
      return rssResponse("<rss/>");
    };
    await new BriefingService(repo, fetcher).sync();
    await new BriefingService(repo, fetcher).sync(true);
    assert.equal(requests, 1);
    t.mock.timers.tick(TTL);
    const failed = await new BriefingService(repo, fetcher).sync(true);
    assert.equal(requests, 2);
    assert.equal(failed.snapshot, null);
    assert.match(failed.sync.error!, /RSS feed/);
    await new BriefingService(repo, fetcher).sync(true);
    assert.equal(requests, 2);
  });
});

test("longer server cooldowns apply beyond the local interval, including partial detail requests", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-05T00:00:00Z") });
  await temporary(async (repo) => {
    const xml = await feedXml(await records());
    const initial = await new BriefingService(repo, async () => rssResponse(xml)).sync();
    const briefing = initial.snapshot!.briefings[0];
    t.mock.timers.tick(TTL);
    let requests = 0;
    const service = new BriefingService(repo, async () => {
      requests++;
      return new Response(null, { status: 503, headers: { "retry-after": "7200" } });
    });
    await service.sync(true);
    t.mock.timers.tick(TTL);
    await repo.update((db) => ({ ...db, snapshot: db.snapshot ? { ...db.snapshot, adapterVersion: 0 } : null }));
    await service.detail({ ...briefing, completeness: "partial" }, true);
    assert.equal(requests, 1);
    t.mock.timers.tick(TTL);
    await service.sync(true);
    assert.equal(requests, 2);
  });
});
