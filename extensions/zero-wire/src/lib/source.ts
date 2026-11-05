import { load } from "cheerio";
import { XMLValidator } from "fast-xml-parser";
import { canonicalUrl, contentHash, INDEX_URL, safeUrl, sourceDate, type Briefing } from "./model";

function parseContent(html: string) {
  const $ = load(html);
  $("script, style, noscript, iframe").remove();
  const elements = $("body").find("*").toArray();
  function sectionNodes(name: string) {
    const start = elements.findIndex((node) => $(node).is("h2, h3") && $(node).text().trim() === name);
    if (start < 0) return $([]);
    const level = $(elements[start]).is("h2") ? 2 : 3;
    let end = start + 1;
    while (end < elements.length) {
      const node = $(elements[end]);
      if (node.is("h1, h2") || (level === 3 && node.is("h3"))) break;
      end++;
    }
    return $(elements.slice(start + 1, end));
  }
  function section(name: string): string[] {
    return sectionNodes(name)
      .filter("p, li")
      .filter((_, node) => !$(node).find("p, li").length)
      .toArray()
      .map((node) => $(node).text().trim())
      .filter((value) => value && value !== "Copy link" && value !== "Copy prompt");
  }
  const prompt = sectionNodes("Assess your exposure with an agent").filter("pre").first().text();
  const evidenceNodes = sectionNodes("Evidence and sources");
  const evidence: Briefing["evidence"] = [],
    evidenceNotes: string[] = [];
  let heading = "",
    description: string[] = [],
    groupLinks: Briefing["evidence"] = [];
  function finishEvidenceGroup() {
    const note = [heading, ...description].filter(Boolean).join("\n\n");
    if (groupLinks.length) evidence.push(...groupLinks.map((link) => ({ ...link, description: note })));
    else if (description.length) evidenceNotes.push(note);
  }
  for (const node of evidenceNodes.toArray()) {
    if ($(node).is("h3")) {
      finishEvidenceGroup();
      heading = $(node).text().trim();
      description = [];
      groupLinks = [];
    }
    if (
      $(node).is("p") &&
      !$(node)
        .find("a[href]")
        .toArray()
        .some((a) => canonicalUrl($(a).attr("href") ?? ""))
    )
      description.push($(node).text().trim());
    if (!$(node).is("a[href]") || !$(node).closest("li").length) continue;
    const url = safeUrl($(node).attr("href") ?? "");
    if (url) groupLinks.push({ title: $(node).text().trim() || url, url, description: "" });
  }
  finishEvidenceGroup();
  const chronology = sectionNodes("Update chronology")
    .filter("li")
    .toArray()
    .map((node) => {
      const item = $(node).clone();
      const date = sourceDate(item.find("time").first().attr("datetime"));
      item.find("time").remove();
      const links = $(node)
        .find("a[href]")
        .toArray()
        .flatMap((a) => {
          const url = safeUrl($(a).attr("href") ?? "");
          return url ? [{ title: $(a).text().trim() || url, url, description: "" }] : [];
        });
      return { date, text: item.text().trim().replace(/^:\s*/, ""), links };
    });
  const intro = [];
  for (const node of $("body").children().toArray()) {
    if ($(node).is("h1, h2, h3")) break;
    intro.push(node);
  }
  const summary = $(intro)
    .filter("p")
    .filter((_, node) => !$(node).find("time, strong").length)
    .first()
    .text()
    .trim();
  return {
    summary,
    action: $("p strong").first().text().trim() || "Unavailable",
    lastChecked: sourceDate($(intro).find("time[datetime]").first().attr("datetime")),
    overview: section("What happened"),
    audience: section("Who should investigate"),
    why: section("Why this needs attention").join("\n\n") || section("Why it remains relevant").join("\n\n"),
    guidance: sectionNodes("What to do now").filter("p").first().text().trim(),
    steps: sectionNodes("What to do now")
      .filter("li")
      .toArray()
      .map((node) => $(node).text().trim()),
    chronology,
    evidence,
    evidenceNotes,
    coverage: [...section("Product coverage"), ...section("Service status")],
    coverageLinks: sectionNodes("Product coverage")
      .add(sectionNodes("Service status"))
      .filter("a[href]")
      .toArray()
      .flatMap((node) => {
        const url = safeUrl($(node).attr("href") ?? "");
        return url ? [{ title: $(node).text().trim() || url, url, description: "" }] : [];
      }),
    assessmentPrompt: prompt.trim() ? prompt : null,
  };
}
export function parseFeed(xml: string, fetchedAt: string): Briefing[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true)
    throw new Error("Zero Wire returned invalid RSS. The last successful snapshot is retained.");
  const $ = load(xml, { xmlMode: true });
  const channel = $("rss > channel");
  if (channel.length !== 1 || channel.children("link").text().trim().replace(/\/$/, "") !== INDEX_URL)
    throw new Error("The response is not the Zero Wire RSS feed");
  const result = new Map<string, Briefing>();
  for (const node of channel.children("item").toArray()) {
    const item = $(node),
      url = canonicalUrl(item.children("link").text().trim()),
      title = item.children("title").text().trim();
    if (!url || !title) throw new Error("A Zero Wire RSS item has no valid canonical URL or title");
    const categories = item.children("category").toArray();
    const labels = categories
      .filter((category) => !$(category).attr("domain"))
      .map((category) => $(category).text().trim());
    const category = labels.find((label) => !/^CVE-\d{4}-\d{4,}$/i.test(label));
    const tags = categories
      .filter((category) => $(category).attr("domain"))
      .flatMap((category) => {
        const name = $(category).text().trim(),
          domain = safeUrl($(category).attr("domain") ?? "");
        return name ? [{ id: domain ?? name.toLowerCase(), name }] : [];
      });
    const content = parseContent(item.children("content\\:encoded").text());
    const b: Omit<Briefing, "hash"> = {
      id: url,
      url,
      title,
      ...content,
      category:
        category === "Needs attention" ? "attention" : category === "Reference" ? "reference" : (category ?? "unknown"),
      cves: [
        ...new Set(labels.filter((label) => /^CVE-\d{4}-\d{4,}$/i.test(label)).map((label) => label.toUpperCase())),
      ],
      tags: [...new Map(tags.map((tag) => [tag.id, tag])).values()],
      fetchedAt,
      sourceUpdatedAt: sourceDate(item.children("pubDate").text()),
      summary: content.summary || item.children("description").text().trim(),
      completeness: content.overview.length && content.audience.length && content.guidance ? "full" : "partial",
      provenance: "rss",
    };
    const previous = result.get(url);
    if (!previous || (Date.parse(b.sourceUpdatedAt ?? "") || 0) > (Date.parse(previous.sourceUpdatedAt ?? "") || 0))
      result.set(url, { ...b, hash: contentHash(b) });
  }
  if (!result.size) throw new Error("Zero Wire returned no RSS items. The last successful snapshot is retained.");
  return [...result.values()];
}
export async function parseDetail(html: string, previous: Briefing, fetchedAt: string): Promise<Briefing> {
  const $ = load(html),
    title = $("h1").first().text().trim();
  if (!title || title !== previous.title)
    throw new Error("The selected briefing page could not be verified. Open the original source.");
  const content = parseContent(html);
  if (!content.overview.length && !content.guidance && !content.assessmentPrompt)
    throw new Error("No reliable detail sections were found. Open the original source.");
  const b: Briefing = { ...previous, ...content, fetchedAt, completeness: "partial", provenance: "html" };
  return { ...b, hash: contentHash(b) };
}
