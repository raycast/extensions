import { readFile } from "node:fs/promises";
import { INDEX_URL } from "../src/lib/model";

export async function records(): Promise<Record<string, unknown>[]> {
  return JSON.parse(await readFile(new URL("./fixtures/briefings.json", import.meta.url), "utf8"));
}
const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function strings(value: unknown): string[] {
  return typeof value === "string"
    ? [value]
    : Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
}
export async function feedXml(entries: unknown[]): Promise<string> {
  const items = entries
    .map((entry) => {
      if (!entry || typeof entry !== "object") throw new Error("Invalid test fixture");
      const v = entry as Record<string, unknown>;
      const list = (field: string) =>
        strings(v[field])
          .map((s) => `<li>${escape(s)}</li>`)
          .join("");
      const group =
        v.group === "attention"
          ? "Needs attention"
          : v.group === "reference"
            ? "Reference"
            : String(v.group ?? "unknown");
      const content = `<p><strong>${escape(String(v.statusType ?? "Unavailable"))}</strong> · Last checked <time datetime="${escape(String(v.lastChecked ?? ""))}"></time></p><p>${escape(String(v.description ?? ""))}</p><h2>What happened</h2><ul>${list("whatHappened")}</ul><h2>Why this needs attention</h2><p>${escape(String(v.why ?? ""))}</p><h2>Who should investigate</h2><p>${strings(v.whoShouldInvestigate).map(escape).join("\n\n")}</p><h2>What to do now</h2><p>${escape(String(v.whatToDo ?? ""))}</p><ol>${list("steps")}</ol>${v.assessmentPrompt ? `<h3>Assess your exposure with an agent</h3><pre>${escape(String(v.assessmentPrompt))}</pre>` : ""}<h2>Evidence and sources</h2><h3>Vendor advisories</h3><p>Read applicability per CVE.</p><ul><li><a href="https://example.com/first">First advisory</a></li><li><a href="https://example.com/second">Follow-up advisory</a></li><li><a href="javascript:alert(1)">Unsafe link</a></li></ul>`;
      const tags = Array.isArray(v.tags)
        ? v.tags.map((t) =>
            typeof t === "string" ? { id: t.toLowerCase(), name: t } : (t as { id: string; name: string }),
          )
        : [];
      return `<item><title>${escape(String(v.title))}</title><link>${INDEX_URL}/${v.slug}</link><guid>${v.slug}@2026-11-04</guid><pubDate>Wed, 04 Nov 2026 00:00:00 GMT</pubDate><description>${escape(String(v.description ?? ""))}</description><content:encoded><![CDATA[${content}]]></content:encoded><category>${escape(group)}</category>${strings(
        v.cves,
      )
        .map((c) => `<category>${escape(c)}</category>`)
        .join(
          "",
        )}${tags.map((t) => `<category domain="${INDEX_URL}/tag/${escape(t.id)}">${escape(t.name)}</category>`).join("")}</item>`;
    })
    .join("");
  return `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Zero Wire</title><link>${INDEX_URL}</link>${items}</channel></rss>`;
}
export function rssResponse(xml: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(xml, { headers: { "content-type": "application/rss+xml", ...extraHeaders } });
}
