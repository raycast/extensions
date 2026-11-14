import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BriefingTools } from "../src/lib/ai-tools";
import { BriefingService } from "../src/lib/service";
import { Repository } from "../src/lib/storage";
import { INDEX_URL } from "../src/lib/model";
import { rssResponse } from "./helpers";

async function setup(run: (context: { tools: BriefingTools; repository: Repository; xml: string }) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "zero-wire-ai-"));
  try {
    const repository = new Repository(directory);
    const xml = await readFile(new URL("./fixtures/zero-wire-rss.xml", import.meta.url), "utf8");
    const tools = new BriefingTools(new BriefingService(repository, async () => rssResponse(xml)));
    await run({ tools, repository, xml });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
test("AI search finds every CVE and Reference by default, validates pagination and returns cloneable provenance", async () =>
  setup(async ({ tools }) => {
    const result = await tools.search({ query: "cve2026115560" });
    assert.equal(result.total, 1);
    assert.equal(result.briefings[0].title, "php2shell");
    assert.equal(result.briefings[0].attribution.licenseUrl, "https://creativecommons.org/licenses/by-nc/4.0/");
    assert.match(result.briefings[0].attribution.notice, /Extracted and reformatted/);
    assert.equal(result.freshness.status, "fresh");
    assert.equal(result.briefings[0].sourceLastChecked, "2026-11-02");
    assert.equal((await tools.search({ query: "CVE-2026-60137" })).briefings[0].category, "Reference");
    const page = await tools.search({ limit: 2 });
    assert.equal(page.total, 6);
    assert.equal(page.nextOffset, 2);
    const next = await tools.search({ limit: 2, offset: page.nextOffset! });
    assert.equal(
      next.briefings.some((b) => page.briefings.some((p) => p.id === b.id)),
      false,
    );
    assert.deepEqual(structuredClone(result), result);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
    for (const input of [{ limit: 0 }, { limit: 101 }, { offset: -1 }, { limit: 2.5 }])
      await assert.rejects(tools.search(input));
  }));
test("AI detail retains all qualifiers and complete prompts without modifying bookmarks, follows, or review state", async () =>
  setup(async ({ tools, repository }) => {
    await tools.search({});
    const before = await repository.read();
    const result = await tools.get({ briefingId: "php2shell" });
    assert.equal(result.status, "found");
    assert.ok(result.briefing);
    assert.equal(result.briefing.assessmentPrompt?.length, 3691);
    assert.equal(result.briefing.assessmentPrompt, before.archive[`${INDEX_URL}/php2shell`].assessmentPrompt);
    assert.ok(
      result.briefing.overview.some((text) => text.includes("Exploitation of CVE-2026-115560 is not established")),
    );
    assert.ok(result.briefing.evidence.some((e) => e.description.includes("does not extend to CVE-2026-115560")));
    assert.deepEqual(
      result.briefing.cloudflareCoverageLinks,
      before.archive[`${INDEX_URL}/php2shell`].coverageLinks.map(({ title, url }) => ({ title, url })),
    );
    assert.deepEqual(
      result.briefing.cloudflareCoverageLinks.map((link) => link.title),
      ["Paid plans", "Free plans"],
    );
    const noPrompt = await tools.get({ briefingId: "emudhra-certificate-compromise" });
    assert.equal(noPrompt.briefing?.assessmentPrompt, null);
    assert.ok(noPrompt.briefing?.evidenceNotes.some((note) => note.includes("No CVE was cited")));
    assert.deepEqual(structuredClone(result), result);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
    const after = await repository.read();
    assert.deepEqual(after.bookmarks, before.bookmarks);
    assert.deepEqual(after.followed, before.followed);
    assert.deepEqual(after.reviewed, before.reviewed);
    assert.equal(after.revision, before.revision);
  }));
test("AI filters share local bookmarks, followed tags and review state; archived results expose unknown availability", async () =>
  setup(async ({ tools, repository }) => {
    const initial = await tools.get({ briefingId: "php2shell" });
    const b = initial.briefing!;
    await repository.update((db) => ({
      ...db,
      bookmarks: { [b.id]: true },
      followed: { [`${INDEX_URL}/tag/php`]: "PHP" },
      reviewed: { [b.id]: b.contentHash },
    }));
    assert.equal((await tools.search({ savedOnly: true })).total, 1);
    assert.equal((await tools.search({ savedOnly: true, filter: "unread" })).total, 0);
    assert.equal((await tools.search({ filter: "following" })).total, 2);
    await repository.update((db) => ({
      ...db,
      snapshot: db.snapshot
        ? { ...db.snapshot, briefings: db.snapshot.briefings.filter((item) => item.id !== b.id) }
        : null,
    }));
    const archived = await tools.get({ briefingId: b.id });
    assert.equal(archived.status, "found");
    assert.equal(archived.briefing?.sourceAvailability, "unknown");
    assert.equal((await tools.search({ savedOnly: true })).briefings[0].sourceAvailability, "unknown");
  }));
test("AI distinguishes source unavailability, stale cached results, and a successful miss", async () =>
  setup(async ({ tools, repository }) => {
    const offline = new BriefingTools(
      new BriefingService(repository, async () => {
        throw new Error("Offline");
      }),
    );
    const unavailable = await offline.search({ query: "PHP" });
    assert.equal(unavailable.freshness.status, "unavailable");
    assert.equal(unavailable.freshness.error, "Offline");
    assert.equal((await offline.get({ briefingId: "php2shell" })).status, "unavailable");
    await repository.update((db) => ({ ...db, sync: { ...db.sync, retryAt: 0, lastAttempt: null } }));
    await tools.search({});
    const miss = await tools.get({ briefingId: "unknown-briefing" });
    assert.equal(miss.status, "not-found");
    assert.equal(miss.freshness.status, "fresh");
    await repository.update((db) => ({
      ...db,
      snapshot: db.snapshot ? { ...db.snapshot, checkedAt: "2000-01-01T00:00:00Z" } : null,
      sync: { ...db.sync, lastAttempt: null },
    }));
    const cached = await offline.get({ briefingId: "php2shell" });
    assert.equal(cached.status, "found");
    assert.equal(cached.freshness.status, "stale");
    assert.equal(cached.freshness.error, "Offline");
    assert.equal(cached.briefing?.title, "php2shell");
    assert.equal((await offline.get({ briefingId: "unknown-briefing" })).status, "unavailable");
  }));
test("invalid AI briefing identifiers are rejected before any request", async () =>
  setup(async ({ repository }) => {
    let requests = 0;
    const tools = new BriefingTools(
      new BriefingService(repository, async () => {
        requests++;
        throw new Error("Unexpected request");
      }),
    );
    for (const briefingId of [
      "",
      "https://example.com/briefing",
      "javascript:alert(1)",
      `${INDEX_URL}/rss`,
      "../../private",
    ])
      await assert.rejects(tools.get({ briefingId }));
    assert.equal(requests, 0);
  }));
