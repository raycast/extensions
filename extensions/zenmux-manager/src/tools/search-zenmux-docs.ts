import { Cache } from "@raycast/api";
import { ZENMUX_DOC_MANIFEST, ZenMuxDocManifestEntry, routingMatches } from "../zenmux-doc-routing";
import { getErrorMessage } from "../zenmux";
import { ZENMUX_DOCS, ZenMuxDocEntry } from "../zenmux-docs";

type Input = {
  /**
   * The user's ZenMux documentation or configuration question.
   */
  query: string;

  /**
   * Optional maximum number of curated documentation results to return. Defaults to 5.
   */
  limit?: number;
};

const cache = new Cache();
const DOC_CACHE_PREFIX = "zenmux-doc:";
const MAX_DOCS = 3;
const MAX_BODY_CHARS = 3500;

type CachedDoc = {
  body: string;
  fetchedAt: string;
};

type RuntimeDoc = ZenMuxDocManifestEntry & {
  body?: string;
  fetchedAt?: string;
  source: "live" | "cache" | "unavailable";
  error?: string;
};

/**
 * Search curated docs plus selected official ZenMux markdown docs.
 *
 * Runtime behavior is public-extension safe: users do not need Git, Node, or
 * a local docs clone. The extension fetches 1-3 relevant markdown files over
 * HTTPS and stores them in Raycast Cache for offline/stale fallback.
 */
export default async function searchZenMuxDocs(input: Input) {
  const query = input.query.trim();
  if (!query) {
    return "No query provided. Ask a ZenMux documentation or configuration question.";
  }

  const curatedLimit = Math.min(Math.max(input.limit ?? 5, 1), 8);
  const terms = tokenize(query);

  const curatedMatches = ZENMUX_DOCS.map((entry) => ({
    entry,
    score: scoreCurated(terms, entry),
  }))
    .filter((match) => match.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, curatedLimit);

  const selectedDocs = scoreManifest(query, terms).slice(0, MAX_DOCS);
  const runtimeDocs = await Promise.all(selectedDocs.map(({ doc }) => fetchRuntimeDoc(doc)));

  if (curatedMatches.length === 0 && runtimeDocs.length === 0) {
    return [
      `No ZenMux documentation match found for: ${query}`,
      "",
      "State that the topic is not covered by curated facts or the public docs routing manifest and direct the user to:",
      "- https://docs.zenmux.ai/",
      "Do not invent ZenMux endpoints, env vars, key formats, or pricing.",
    ].join("\n");
  }

  const output: string[] = [`ZenMux documentation matches for: ${query}`, ""];

  if (curatedMatches.length > 0) {
    output.push("== Curated answer-ready facts ==");
    output.push("");
    curatedMatches.forEach(({ entry }, index) => {
      output.push(formatCuratedEntry(entry, index + 1));
      output.push("");
    });
  }

  if (runtimeDocs.length > 0) {
    output.push("== Official docs fetched over HTTPS ==");
    output.push("");
    runtimeDocs.forEach((doc, index) => {
      output.push(formatRuntimeDoc(doc, index));
      output.push("");
    });
  }

  output.push(
    "Answering rules:",
    "- Reproduce values inside `Answer-ready facts`, `Copy-paste snippet`, and fetched official docs verbatim. Do not paraphrase endpoints, env var names, key formats, field names, or enum values.",
    "- If `Setup steps` are present in a curated entry, follow that order in your answer.",
    "- If `Do not say` is present, never include those statements.",
    "- Fetched official docs may come from live HTTPS or Raycast Cache; cite the Source URL either way.",
    "- If a curated entry contradicts a fetched doc excerpt, prefer the curated entry (it is hand-verified).",
    "- Always cite the `Source` URL for the entry/doc you used.",
    "- If the returned content does not cover the question, say so plainly and point to the Source URL or https://docs.zenmux.ai/. Do not guess.",
  );

  return output.join("\n");
}

// ---------------- curated entries ----------------

function formatCuratedEntry(entry: ZenMuxDocEntry, index: number): string {
  const lines: string[] = [
    `${index}. ${entry.title}`,
    `   Category: ${entry.category}`,
    `   Source: ${entry.url}`,
    `   Summary: ${entry.summary}`,
  ];

  if (entry.facts && entry.facts.length > 0) {
    lines.push("   Answer-ready facts:");
    for (const fact of entry.facts) {
      lines.push(`     - ${fact}`);
    }
  }

  if (entry.steps && entry.steps.length > 0) {
    lines.push("   Setup steps:");
    entry.steps.forEach((step, stepIndex) => {
      lines.push(`     ${stepIndex + 1}. ${step}`);
    });
  }

  if (entry.snippet && entry.snippet.code.trim().length > 0) {
    lines.push(`   Copy-paste snippet (${entry.snippet.language}):`);
    lines.push(`     \`\`\`${entry.snippet.language}`);
    for (const codeLine of entry.snippet.code.split("\n")) {
      lines.push(`     ${codeLine}`);
    }
    lines.push("     ```");
  }

  if (entry.warnings && entry.warnings.length > 0) {
    lines.push("   Do not say:");
    for (const warning of entry.warnings) {
      lines.push(`     - ${warning}`);
    }
  }

  return lines.join("\n");
}

function scoreCurated(terms: string[], entry: ZenMuxDocEntry): number {
  const title = entry.title.toLowerCase();
  const category = entry.category.toLowerCase();
  const summary = entry.summary.toLowerCase();
  const keywords = entry.keywords.join(" ").toLowerCase();
  const facts = (entry.facts ?? []).join(" ").toLowerCase();
  const url = entry.url.toLowerCase();

  return terms.reduce((score, term) => {
    if (title.includes(term)) score += 8;
    if (keywords.includes(term)) score += 5;
    if (facts.includes(term)) score += 4;
    if (category.includes(term)) score += 3;
    if (summary.includes(term)) score += 2;
    if (url.includes(term)) score += 1;
    return score;
  }, 0);
}

// ---------------- runtime docs ----------------

const ROUTING_BOOST = 50;
const TITLE_HIT = 12;
const PATH_HIT = 3;
const URL_HIT = 1;

type ManifestMatch = { doc: ZenMuxDocManifestEntry; score: number };

function scoreManifest(rawQuery: string, terms: string[]): ManifestMatch[] {
  if (ZENMUX_DOC_MANIFEST.length === 0) {
    return [];
  }

  const routedPaths = new Set(routingMatches(rawQuery));

  const scored: ManifestMatch[] = ZENMUX_DOC_MANIFEST.map((doc) => {
    let score = 0;

    if (routedPaths.has(doc.path)) {
      score += ROUTING_BOOST;
    }

    const title = doc.title.toLowerCase();
    const url = doc.url.toLowerCase();
    const path = doc.path.toLowerCase();

    for (const term of terms) {
      if (title.includes(term)) score += TITLE_HIT;
      if (path.includes(term)) score += PATH_HIT;
      if (url.includes(term)) score += URL_HIT;
    }

    return { doc, score };
  })
    .filter((match) => match.score > 0)
    .sort((first, second) => second.score - first.score);

  return scored;
}

async function fetchRuntimeDoc(doc: ZenMuxDocManifestEntry): Promise<RuntimeDoc> {
  const cacheKey = `${DOC_CACHE_PREFIX}${doc.path}`;

  try {
    const response = await fetch(doc.rawUrl, {
      headers: { Accept: "text/markdown,text/plain,*/*" },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim());
    }

    const body = stripFrontmatter(await response.text()).trim();
    const fetchedAt = new Date().toISOString();
    cache.set(cacheKey, JSON.stringify({ body, fetchedAt } satisfies CachedDoc));
    return { ...doc, body, fetchedAt, source: "live" };
  } catch (error) {
    const cached = readCachedDoc(cacheKey);
    if (cached) {
      return {
        ...doc,
        body: cached.body,
        fetchedAt: cached.fetchedAt,
        source: "cache",
        error: getErrorMessage(error),
      };
    }

    return {
      ...doc,
      source: "unavailable",
      error: getErrorMessage(error),
    };
  }
}

function readCachedDoc(cacheKey: string): CachedDoc | undefined {
  const cached = cache.get(cacheKey);
  if (!cached) {
    return undefined;
  }

  try {
    return JSON.parse(cached) as CachedDoc;
  } catch {
    return undefined;
  }
}

function formatRuntimeDoc(doc: RuntimeDoc, index: number): string {
  const label = String.fromCharCode("A".charCodeAt(0) + index);
  const lines = [
    `${label}. ${doc.title}`,
    `   Path: ${doc.path}`,
    `   Source: ${doc.url}`,
    `   Retrieval: ${formatRetrievalStatus(doc)}`,
  ];

  if (doc.body) {
    lines.push("   --- begin excerpt ---", indent(excerptBody(doc.body), "   "), "   --- end excerpt ---");
  } else {
    lines.push("   No excerpt available. Use the Source URL only; do not guess content.");
  }

  return lines.join("\n");
}

function formatRetrievalStatus(doc: RuntimeDoc): string {
  if (doc.source === "live") {
    return `live HTTPS fetch at ${doc.fetchedAt}`;
  }

  if (doc.source === "cache") {
    return `Raycast Cache from ${doc.fetchedAt}; live fetch failed: ${doc.error}`;
  }

  return `unavailable; live fetch failed: ${doc.error}`;
}

/**
 * Trim the markdown body to a token-friendly excerpt. We keep the start of
 * the file (which usually contains intro + setup + config code) and append a
 * truncation marker if the doc exceeds the budget.
 */
function excerptBody(body: string): string {
  if (body.length <= MAX_BODY_CHARS) {
    return body;
  }
  const slice = body.slice(0, MAX_BODY_CHARS);
  const lastNewline = slice.lastIndexOf("\n");
  const safeSlice = lastNewline > MAX_BODY_CHARS - 400 ? slice.slice(0, lastNewline) : slice;
  return `${safeSlice}\n\n[... truncated; read full doc at the Source URL above ...]`;
}

function indent(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function stripFrontmatter(text: string): string {
  if (!text.startsWith("---")) {
    return text;
  }

  const end = text.search(/\n---(\r?\n)/);
  if (end === -1) {
    return text;
  }

  return text.slice(text.indexOf("\n", end + 1) + 1);
}

// ---------------- tokenization ----------------

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

/**
 * Stop words include grammatical filler AND generic scaffolding verbs
 * (`configure`, `setup`, `set`, `install`, `using`, `want`, `need`, etc.)
 * because those match so many summaries that they let unrelated entries
 * crowd out the topic-specific match. Keep ZenMux-distinctive terms out.
 */
const STOP_WORDS = new Set([
  "about",
  "and",
  "are",
  "can",
  "configure",
  "configuration",
  "do",
  "does",
  "for",
  "from",
  "guide",
  "help",
  "how",
  "install",
  "installation",
  "into",
  "integrate",
  "integration",
  "need",
  "set",
  "setup",
  "the",
  "this",
  "to",
  "use",
  "using",
  "want",
  "with",
  "zenmux",
]);
