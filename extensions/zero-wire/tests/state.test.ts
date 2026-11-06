import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { contentHash, emptyDatabase, isUnread, selectBriefings } from "../src/lib/model";
import { parseFeed } from "../src/lib/source";
import { Repository } from "../src/lib/storage";
import { feedXml, records } from "./helpers";

const fetchedAt = "2026-11-04T18:00:00.000Z";
test("each CVE, punctuation normalization, categories, follows, bookmarks and unread combine", async () => {
  const briefings = await parseFeed(await feedXml(await records()), fetchedAt);
  const db = emptyDatabase();
  db.snapshot = { adapterVersion: 1, fetchedAt, checkedAt: fetchedAt, etag: null, lastModified: null, briefings };
  db.archive = Object.fromEntries(briefings.map((b) => [b.id, b]));
  const first = briefings[0];
  for (const cve of first.cves)
    assert.equal(selectBriefings(db, cve.replaceAll("-", ""), "attention")[0]?.id, first.id);
  db.followed["https://radar.cloudflare.com/security/zero-wire/tag/php"] = "PHP";
  db.followed["https://radar.cloudflare.com/security/zero-wire/tag/runtime"] = "Runtime";
  assert.equal(selectBriefings(db, "php", "following").length, 1);
  db.bookmarks[briefings[1].id] = true;
  assert.equal(selectBriefings(db, "", "all", true)[0].category, "reference");
  db.reviewed[first.id] = first.hash;
  assert.equal(isUnread(first, db), false);
  assert.equal(selectBriefings(db, first.title, "unread").length, 0);
});
test("semantic hashes ignore check dates, whitespace and retrieval but detect substantive revisions", async () => {
  const [b] = await parseFeed(await feedXml(await records()), fetchedAt);
  assert.equal(
    contentHash({
      ...b,
      fetchedAt: "later",
      lastChecked: "2026-11-05",
      summary: `  ${b.summary.replaceAll(" ", "\n")} `,
    }),
    b.hash,
  );
  assert.notEqual(contentHash({ ...b, guidance: "New guidance" }), b.hash);
  assert.notEqual(contentHash({ ...b, assessmentPrompt: "Changed prompt" }), b.hash);
});
test("concurrent repositories preserve independent user-state mutations and restart state", async () => {
  const directory = await mkdtemp(join(tmpdir(), "zero-wire-test-"));
  try {
    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        new Repository(directory).update((db) => ({
          ...db,
          followed: { ...db.followed, [`tag-${index}`]: `Tag ${index}` },
        })),
      ),
    );
    assert.equal(Object.keys((await new Repository(directory).read()).followed).length, 12);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("search remains below the PRD's 100 ms budget for 1000 entries", async () => {
  const [b] = await parseFeed(await feedXml(await records()), fetchedAt);
  const db = emptyDatabase();
  const entries = Array.from({ length: 1000 }, (_, index) => ({
    ...b,
    id: `${b.id}-${index}`,
    title: `${b.title} ${index}`,
  }));
  db.snapshot = {
    adapterVersion: 1,
    fetchedAt,
    checkedAt: fetchedAt,
    etag: null,
    lastModified: null,
    briefings: entries,
  };
  const start = performance.now();
  assert.equal(selectBriefings(db, "CVE202610001", "attention").length, 1000);
  assert.ok(performance.now() - start < 100);
});
