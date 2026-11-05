import { categoryName, SOURCE_LICENSE_URL, SOURCE_LICENSE_NOTICE, type Briefing } from "./model";
export function escapeMarkdown(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([\\`*_[\]#|])/g, "\\$1");
}
const paragraphs = (items: string[]) => items.map(escapeMarkdown).join("\n\n");
export function briefingMarkdown(b: Briefing): string {
  const section = (title: string, content: string) => (content ? `## ${title}\n\n${content}\n\n` : "");
  return (
    `# ${escapeMarkdown(b.title)}\n\n` +
    `Source: [Cloudflare Zero Wire](<${b.url}>) · ${escapeMarkdown(categoryName(b.category))}\n\n` +
    `CVEs: ${b.cves.length ? b.cves.map(escapeMarkdown).join(", ") : "None listed"}\n\n` +
    `Recommended action: ${escapeMarkdown(b.action)}\n\n` +
    `RSS item date: ${escapeMarkdown(b.sourceUpdatedAt ?? "Unknown")}\n\n` +
    `Source last checked: ${escapeMarkdown(b.lastChecked ?? "Unknown")}\n\nRetrieved locally: ${escapeMarkdown(b.fetchedAt)}\n\n` +
    (b.completeness !== "full" ? "Partial source content. Open the original briefing for complete guidance.\n\n" : "") +
    section("Summary", escapeMarkdown(b.summary)) +
    section("Overview", paragraphs(b.overview)) +
    section("Why this needs attention", escapeMarkdown(b.why)) +
    section("Who should investigate", paragraphs(b.audience)) +
    section(
      "What to do now",
      [escapeMarkdown(b.guidance), b.steps.map((s, i) => `${i + 1}. ${escapeMarkdown(s)}`).join("\n\n")]
        .filter(Boolean)
        .join("\n\n"),
    ) +
    section(
      "Update chronology",
      b.chronology
        .map(
          (c) =>
            `- ${escapeMarkdown(c.date ?? "Unknown date")}: ${escapeMarkdown(c.text)}${c.links.map((l) => ` [${escapeMarkdown(l.title)}](<${l.url}>)`).join("")}`,
        )
        .join("\n\n"),
    ) +
    section(
      "Cloudflare coverage",
      [
        paragraphs(b.coverage),
        b.coverageLinks.map((link) => `- [${escapeMarkdown(link.title)}](<${link.url}>)`).join("\n"),
      ]
        .filter(Boolean)
        .join("\n\n"),
    ) +
    section(
      "Evidence and sources",
      [
        ...b.evidence.map(
          (e) =>
            `- [${escapeMarkdown(e.title)}](<${e.url}>)${e.description ? `\n\n  ${escapeMarkdown(e.description)}` : ""}`,
        ),
        ...b.evidenceNotes.map(escapeMarkdown),
      ].join("\n\n"),
    ) +
    `---\n\n${SOURCE_LICENSE_NOTICE} [License](<${SOURCE_LICENSE_URL}>).\n\n` +
    "A technology match indicates relevance; review status records your acknowledgment of this revision.\n"
  );
}
