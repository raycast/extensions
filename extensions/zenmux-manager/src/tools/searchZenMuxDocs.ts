import { ZENMUX_DOCS } from "../zenmux-docs";

type Input = {
  /**
   * The user's ZenMux documentation or configuration question.
   */
  query: string;

  /**
   * Optional maximum number of documentation results to return. Defaults to 5.
   */
  limit?: number;
};

/**
 * Search curated ZenMux documentation entries for product, API, configuration, routing, billing, observability, and integration guidance.
 */
export default function searchZenMuxDocs(input: Input) {
  const query = input.query.trim();
  if (!query) {
    return "No query provided. Ask a ZenMux documentation or configuration question.";
  }

  const limit = Math.min(Math.max(input.limit ?? 5, 1), 8);
  const terms = tokenize(query);
  const matches = ZENMUX_DOCS.map((entry) => ({
    entry,
    score: scoreEntry(terms, entry),
  }))
    .filter((match) => match.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, limit);

  if (matches.length === 0) {
    return [
      `No curated ZenMux documentation match found for: ${query}`,
      "",
      "Use the official docs for broader search:",
      "- https://docs.zenmux.ai/",
    ].join("\n");
  }

  return [
    `ZenMux documentation matches for: ${query}`,
    "",
    ...matches.map(({ entry }, index) =>
      [
        `${index + 1}. ${entry.title}`,
        `   Category: ${entry.category}`,
        `   Summary: ${entry.summary}`,
        `   Source: ${entry.url}`,
      ].join("\n"),
    ),
    "",
    "Use these summaries and source URLs to answer. If the user needs exact syntax beyond the summaries, point them to the source URL.",
  ].join("\n");
}

function scoreEntry(
  terms: string[],
  entry: (typeof ZENMUX_DOCS)[number],
): number {
  const title = entry.title.toLowerCase();
  const category = entry.category.toLowerCase();
  const summary = entry.summary.toLowerCase();
  const keywords = entry.keywords.join(" ").toLowerCase();
  const url = entry.url.toLowerCase();

  return terms.reduce((score, term) => {
    if (title.includes(term)) {
      score += 8;
    }
    if (keywords.includes(term)) {
      score += 5;
    }
    if (category.includes(term)) {
      score += 3;
    }
    if (summary.includes(term)) {
      score += 2;
    }
    if (url.includes(term)) {
      score += 1;
    }
    return score;
  }, 0);
}

function tokenize(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 1)
        .filter((term) => !STOP_WORDS.has(term)),
    ),
  );
}

const STOP_WORDS = new Set([
  "about",
  "and",
  "are",
  "can",
  "does",
  "for",
  "from",
  "how",
  "into",
  "the",
  "this",
  "to",
  "use",
  "what",
  "where",
  "with",
  "zenmux",
]);
