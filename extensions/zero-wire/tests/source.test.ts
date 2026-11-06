import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { load } from "cheerio";
import { parseFeed, parseDetail } from "../src/lib/source";
import { INDEX_URL, briefingSchema, canonicalUrl, contentHash, safeUrl } from "../src/lib/model";
import { briefingMarkdown, escapeMarkdown } from "../src/lib/markdown";
import { feedXml, records } from "./helpers";

const fetchedAt = "2026-11-04T18:00:00.000Z";
test("captured live RSS recovers six complete entries, all CVEs, tags, actions and exact source prompts", async () => {
  const xml = await readFile(new URL("./fixtures/zero-wire-rss.xml", import.meta.url), "utf8");
  const result = parseFeed(xml, fetchedAt);
  assert.equal(result.length, 6);
  assert.equal(result.filter((b) => b.category === "attention").length, 5);
  assert.equal(result.filter((b) => b.category === "reference").length, 1);
  assert.ok(result.every((b) => b.completeness === "full"));
  const php = result.find((b) => b.title === "php2shell")!;
  assert.deepEqual(php.cves, ["CVE-2026-109618", "CVE-2026-109619", "CVE-2026-115560"]);
  assert.equal(php.tags[0].id, `${INDEX_URL}/tag/php`);
  assert.equal(php.action, "Prioritize patching");
  assert.equal(php.lastChecked, "2026-11-02");
  assert.equal(php.chronology[0].date, "2026-10-30");
  assert.equal(php.chronology[0].text.startsWith("Cloudflare reported"), true);
  const $ = load(xml, { xmlMode: true });
  const content = $("item")
    .filter((_, node) => $(node).children("title").text() === "php2shell")
    .children("content\\:encoded")
    .text();
  const expectedPrompt = load(content)("pre").text();
  assert.equal(php.assessmentPrompt, expectedPrompt);
  assert.equal(php.assessmentPrompt?.length, 3691);
  assert.ok(php.assessmentPrompt?.includes("Do not extend CISA KEV evidence"));
  assert.equal(result.filter((b) => b.assessmentPrompt).length, 2);
  const noCve = result.find((b) => b.title === "eMudhra certificate compromise")!;
  assert.deepEqual(noCve.cves, []);
  assert.equal(noCve.assessmentPrompt, null);
  assert.ok(noCve.evidenceNotes.some((note) => note.includes("No CVE was cited")));
  assert.ok(briefingMarkdown(noCve).includes("tracked as a security incident"));
  assert.ok(php.evidence.every((e) => e.title !== "Read the briefing"));
  const exported = briefingMarkdown(php);
  assert.ok(exported.includes(php.url));
  assert.ok(exported.includes("https://creativecommons.org/licenses/by-nc/4.0/"));
  assert.match(exported, /Extracted and reformatted/);
  assert.ok(exported.includes(escapeMarkdown(fetchedAt)));
  assert.match(exported, /Exploitation of CVE/);
  assert.ok(php.evidence.some((e) => e.description.includes("does not extend to CVE-2026-115560")));
});
test("coverage retains safe rules links in parsed content, Markdown, and revision identity", async () => {
  const xml = await readFile(new URL("./fixtures/zero-wire-rss.xml", import.meta.url), "utf8");
  const php = parseFeed(xml, fetchedAt).find((b) => b.title === "php2shell")!;
  assert.deepEqual(
    php.coverageLinks.map((link) => link.title),
    ["Paid plans", "Free plans"],
  );
  for (const link of php.coverageLinks) {
    const url = new URL(link.url);
    assert.equal(url.origin, "https://dash.cloudflare.com");
    assert.equal(url.searchParams.get("search"), "CVE-2026-109618");
    assert.ok(briefingMarkdown(php).includes(`[${link.title}](<${link.url}>)`));
  }
  assert.notEqual(
    php.hash,
    contentHash({
      ...php,
      coverageLinks: php.coverageLinks.map((link) => ({ ...link, url: `${link.url}&changed=1` })),
    }),
  );
  const { coverageLinks, ...legacy } = php;
  assert.deepEqual(briefingSchema.parse(legacy).coverageLinks, []);
  const detail = await parseDetail(
    `<h1>${php.title}</h1><h2>What happened</h2><p>Overview.</p><h2>Product coverage</h2><p>Use <a href="/rules?utm_source=test">Rules</a> and <a href="javascript:alert(1)">unsafe</a>.</p><h3>Service status</h3><p><a href="https://example.com/status">Status</a></p>`,
    php,
    fetchedAt,
  );
  assert.deepEqual(
    detail.coverageLinks.map(({ title, url }) => ({ title, url })),
    [
      { title: "Rules", url: "https://radar.cloudflare.com/rules" },
      { title: "Status", url: "https://example.com/status" },
    ],
  );
  assert.ok(detail.coverage.some((text) => text.includes("unsafe")));
});
test("synthetic Unicode prompts, missing dates, unknown categories and unsafe evidence", async () => {
  const entries = await records();
  const result = parseFeed(await feedXml(entries), fetchedAt);
  assert.equal(result[0].assessmentPrompt, entries[0].assessmentPrompt);
  assert.equal(result[0].evidence.length, 2);
  assert.equal(result[1].lastChecked, null);
  assert.equal(result[2].category, "future");
});
test("RSS GUID revisions use canonical identity and duplicate items choose latest date", async () => {
  const xml = await feedXml((await records()).slice(0, 1));
  const first = parseFeed(xml, fetchedAt)[0];
  const revised = xml.replace("@2026-11-04", "@2026-11-05").replace("Wed, 04 Nov 2026", "Thu, 05 Nov 2026");
  const second = parseFeed(revised, fetchedAt)[0];
  assert.equal(first.id, second.id);
  assert.equal(first.hash, second.hash);
  const item = revised.slice(revised.indexOf("<item>"), revised.indexOf("</item>") + 7);
  const [merged] = parseFeed(xml.replace("</channel>", `${item}</channel>`), fetchedAt);
  assert.equal(merged.sourceUpdatedAt, second.sourceUpdatedAt);
});
test("malformed, truncated, empty, wrong-source XML and HTML challenges fail without script execution", async () => {
  for (const xml of [
    "<rss><channel>",
    "<title>Just a moment...</title>",
    await feedXml([]),
    '<!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><rss/>',
    (await feedXml(await records())).replace(INDEX_URL, "https://example.com"),
  ])
    assert.throws(() => parseFeed(xml, fetchedAt));
  const xml = (await feedXml((await records()).slice(0, 1))).replace(
    "<h2>What happened</h2>",
    "<script>globalThis.__zeroWireExecuted=true</script><h2>What happened</h2>",
  );
  parseFeed(xml, fetchedAt);
  assert.equal("__zeroWireExecuted" in globalThis, false);
});
test("canonical identity rejects external sources and executable or empty evidence URLs", () => {
  assert.equal(canonicalUrl("https://evil.example/security/zero-wire/test"), null);
  assert.equal(canonicalUrl("/security/zero-wire/test?utm_source=test"), `${INDEX_URL}/test`);
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl(""), null);
  assert.equal(safeUrl("https://example.com/?utm_source=x&keep=yes"), "https://example.com/?keep=yes");
});
test("selected HTML detail copies only the identified assessment prompt and escapes source markup", async () => {
  const [b] = parseFeed(await feedXml(await records()), fetchedAt);
  const prompt = "Line one\n\n  Indented <script>example</script>\n";
  const html = `<h1>${b.title}</h1><pre>Unrelated code block</pre><h3>What happened</h3><p>Do not generalize evidence.</p><h3>Who should investigate</h3><p>Relevant teams.</p><h2>What to do now</h2><p>Read the advisory.</p><h3>Assess your exposure with an agent</h3><pre>${prompt.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
  const detail = await parseDetail(html, b, fetchedAt);
  assert.equal(detail.assessmentPrompt, prompt);
  assert.match(briefingMarkdown({ ...detail, summary: "<img src=x onerror=bad()>" }), /&lt;img/);
  assert.equal(detail.completeness, "partial");
});

test("exported text retains function parentheses and CVE punctuation without visible escaping", () => {
  assert.equal(
    escapeMarkdown("ini_set() before session_start(). CVE-2026-115560"),
    "ini_set() before session_start(). CVE-2026-115560".replaceAll("_", "\\_"),
  );
});
