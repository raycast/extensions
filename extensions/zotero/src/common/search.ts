import fuzzysort from "fuzzysort";
import { itemIdentity } from "./library";
import type { RefData } from "./zoteroApi";

export interface ParsedQuery {
  terms: string[];
  tags: string[];
}

// A query is a space-separated list of terms. A token starting with "." is a
// tag filter (".topology"); everything else is a fuzzy term. "+" stands in for a
// space inside a single token so multi-word tags/terms survive the split.
export function parseQuery(q: string): ParsedQuery {
  const tokens = q.split(/\s+/).filter(Boolean);
  const terms: string[] = [];
  const tags: string[] = [];
  for (const tok of tokens) {
    if (tok.startsWith(".")) {
      const t = tok.slice(1).replace(/\+/g, " ").trim();
      if (t) tags.push(t);
    } else {
      const t = tok.replace(/\+/g, " ").trim();
      if (t) terms.push(t);
    }
  }
  return { terms, tags };
}

export interface RankOptions {
  // Include the Better BibTeX citekey as a (highest-weight) search field.
  bibtexSearch?: boolean;
  // If provided, keep only items belonging to at least one of these collections,
  // identified by library-qualified collection id (`collectionId`).
  collections?: string[];
  // If provided, keep only items whose libraryID is in this set. Used to scope
  // search to the personal library (default) plus any opted-in group libraries.
  libraries?: number[];
  // Max results to return (default 100).
  limit?: number;
  // Per-term score floor; a term scoring below this against every field is
  // treated as "no match" so scattered-subsequence noise doesn't leak in.
  threshold?: number;
}

const DEFAULT_LIMIT = 100;
// fuzzysort score: 1 = perfect, 0 = none. Require at least a weak real match.
const DEFAULT_THRESHOLD = 0.2;

interface Field {
  key: string;
  weight: number;
  array?: boolean;
  bibtexOnly?: boolean;
  // Long free-text fields are matched with a cheap case-insensitive substring
  // test instead of fuzzysort. fuzzysort.single() caches every target string it
  // sees in a module-level Map that is never cleared, and allocates typed
  // arrays proportional to the target length; running it over every item's
  // abstract/notes on each keystroke grows the heap until the Raycast worker is
  // killed ("Worker terminated due to reaching memory limit"). Substring
  // matching allocates nothing persistent and is the right semantics for long
  // prose anyway (scattered-letter subsequence hits in an abstract are noise).
  substring?: boolean;
}

// Weights are relative; higher wins ties across fields. citekey is highest so a
// typed bibtex key beats an incidental substring elsewhere.
const FIELDS: Field[] = [
  { key: "citekey", weight: 1.0, bibtexOnly: true },
  { key: "title", weight: 0.9 },
  { key: "tags", weight: 0.7, array: true },
  { key: "creators", weight: 0.6, array: true },
  { key: "DOI", weight: 0.6 },
  { key: "collection", weight: 0.5, array: true },
  { key: "abstractNote", weight: 0.35, substring: true },
  { key: "date", weight: 0.3 },
  { key: "notes", weight: 0.3, array: true, substring: true },
];

function fieldText(item: RefData, f: Field): string {
  const v = item[f.key];
  if (v == null) return "";
  if (f.array) return Array.isArray(v) ? v.join(" ") : String(v);
  return String(v);
}

// A contiguous substring hit in a long field is a strong signal, so score it as
// a (near) perfect match before weighting.
const SUBSTRING_MATCH_SCORE = 1.0;

// Best weighted score of a single term across all searchable fields (0 = no
// field matched above threshold).
function termScore(item: RefData, term: string, opts: RankOptions): number {
  let best = 0;
  const lowerTerm = term.toLowerCase();
  for (const f of FIELDS) {
    if (f.bibtexOnly && !opts.bibtexSearch) continue;
    const text = fieldText(item, f);
    if (!text) continue;
    if (f.substring) {
      if (text.toLowerCase().includes(lowerTerm)) {
        best = Math.max(best, SUBSTRING_MATCH_SCORE * f.weight);
      }
      continue;
    }
    const r = fuzzysort.single(term, text);
    if (!r || r.score <= 0) continue;
    best = Math.max(best, r.score * f.weight);
  }
  return best;
}

function recency(item: RefData): number {
  const t = item.added ? new Date(item.added as unknown as string).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

function inCollections(item: RefData, allowed: Set<string>): boolean {
  // Filter on library-qualified collection ids, not names or bare keys: distinct
  // collections can share a name or a key across libraries, so only
  // `collectionId(library, key)` keeps them independent.
  if (!item.collectionKeys || item.collectionKeys.length === 0) return false;
  return item.collectionKeys.some((k) => allowed.has(k));
}

// Rank items against a query. Pure: no Raycast / DB access, so it is the tested
// seam. Empty query -> most-recent first. Non-empty -> relevance-ranked with
// AND semantics across terms and exact-ish tag filters. Always deduped by the
// globally unique item identity so personal and group items that share a
// Zotero key both survive.
export function rankResults(items: RefData[], query: string, opts: RankOptions = {}): RefData[] {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;

  const seen = new Set<string>();
  let pool = items.filter((it) => {
    const k = itemIdentity(it);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (opts.collections && opts.collections.length > 0) {
    const allowed = new Set(opts.collections);
    pool = pool.filter((it) => inCollections(it, allowed));
  }

  if (opts.libraries) {
    const allowed = new Set(opts.libraries);
    pool = pool.filter((it) => it.library != null && allowed.has(it.library));
  }

  const { terms, tags } = parseQuery(query);

  // Tag tokens are substring filters (matches Zotero's own tag semantics).
  if (tags.length > 0) {
    const lowered = tags.map((t) => t.toLowerCase());
    pool = pool.filter((it) => {
      const itemTags = (it.tags ?? []).map((t) => t.toLowerCase());
      return lowered.every((needle) => itemTags.some((t) => t.includes(needle)));
    });
  }

  if (terms.length === 0) {
    return pool.sort((a, b) => recency(b) - recency(a)).slice(0, limit);
  }

  const scored: { item: RefData; score: number }[] = [];
  for (const it of pool) {
    let total = 0;
    let matchedAll = true;
    for (const term of terms) {
      const s = termScore(it, term, opts);
      if (s < threshold) {
        matchedAll = false;
        break;
      }
      total += s;
    }
    if (matchedAll) scored.push({ item: it, score: total });
  }

  // Drop fuzzysort's prepared-target cache so the short-field targets prepared
  // during this search don't accumulate across keystrokes.
  fuzzysort.cleanup();

  scored.sort((a, b) => b.score - a.score || recency(b.item) - recency(a.item));
  return scored.slice(0, limit).map((s) => s.item);
}
