import { describe, it, expect } from "vitest";
import { parseQuery, rankResults } from "./search";
import type { RefData } from "./zoteroApi";

const item = (over: Partial<RefData>): RefData => ({
  id: Math.floor(Math.random() * 1e9),
  key: Math.random().toString(36).slice(2),
  added: new Date("2020-01-01"),
  ...over,
});

describe("parseQuery", () => {
  it("splits plain terms", () => {
    expect(parseQuery("quantum simulation")).toEqual({
      terms: ["quantum", "simulation"],
      tags: [],
    });
  });

  it("extracts .tag tokens", () => {
    expect(parseQuery("hello .physics world")).toEqual({
      terms: ["hello", "world"],
      tags: ["physics"],
    });
  });

  it("treats + as space inside a term/tag", () => {
    expect(parseQuery(".machine+learning")).toEqual({
      terms: [],
      tags: ["machine learning"],
    });
  });

  it("ignores empty/whitespace", () => {
    expect(parseQuery("   ")).toEqual({ terms: [], tags: [] });
  });
});

describe("rankResults", () => {
  it("empty query returns most-recent first, capped", () => {
    const old = item({ title: "Old", added: new Date("2019-01-01") });
    const mid = item({ title: "Mid", added: new Date("2020-06-01") });
    const recent = item({ title: "Recent", added: new Date("2022-01-01") });
    const out = rankResults([old, recent, mid], "", { limit: 2 });
    expect(out.map((i) => i.title)).toEqual(["Recent", "Mid"]);
  });

  it("matches a subsequence in the title", () => {
    const a = item({ title: "Quantum Simulation of Lattice Gauge Theories" });
    const b = item({ title: "A Study of Marine Biology" });
    const out = rankResults([a, b], "qsim", {});
    expect(out[0].title).toBe("Quantum Simulation of Lattice Gauge Theories");
  });

  it("ranks a title hit above an abstract-only hit", () => {
    const titleHit = item({ title: "Entanglement Entropy", abstractNote: "unrelated" });
    const abstractHit = item({ title: "Unrelated", abstractNote: "we discuss entanglement entropy at length" });
    const out = rankResults([abstractHit, titleHit], "entanglement", {});
    expect(out[0].title).toBe("Entanglement Entropy");
  });

  it("requires every term to match (AND)", () => {
    const both = item({ title: "Quantum Error Correction" });
    const one = item({ title: "Quantum Computing" });
    const out = rankResults([both, one], "quantum correction", {});
    expect(out.map((i) => i.title)).toEqual(["Quantum Error Correction"]);
  });

  it("filters by .tag token", () => {
    const tagged = item({ title: "Paper A", tags: ["topology"] });
    const untagged = item({ title: "Paper B", tags: ["biology"] });
    const out = rankResults([tagged, untagged], ".topology", {});
    expect(out.map((i) => i.title)).toEqual(["Paper A"]);
  });

  it("matches a bibtex citekey when bibtexSearch is enabled", () => {
    const target = item({ title: "Some Paper", citekey: "smith2020quantum" });
    const other = item({ title: "Another Paper", citekey: "jones2019bio" });
    const out = rankResults([target, other], "smith2020quantum", { bibtexSearch: true });
    expect(out[0].title).toBe("Some Paper");
  });

  it("does not match citekey when bibtexSearch is disabled", () => {
    const target = item({ title: "Some Paper", citekey: "smith2020quantum" });
    const out = rankResults([target], "smith2020quantum", { bibtexSearch: false });
    expect(out).toHaveLength(0);
  });

  it("matches a citekey case-insensitively", () => {
    // Real keys look like "Omran2015"; users often type lowercase.
    const target = item({ title: "Pauli Blocking", citekey: "Omran2015" });
    const out = rankResults([target], "omran2015", { bibtexSearch: true });
    expect(out[0].title).toBe("Pauli Blocking");
  });

  it("matches a partial/fuzzy citekey subsequence", () => {
    const target = item({ title: "Tangent-space methods", citekey: "Vanderstraeten2019" });
    const other = item({ title: "Something else", citekey: "Haegeman2013" });
    const out = rankResults([target, other], "vander2019", { bibtexSearch: true });
    expect(out[0].title).toBe("Tangent-space methods");
  });

  it("ranks a citekey hit above a paper that merely mentions the key text in its title", () => {
    const keyHit = item({ title: "Unrelated Title", citekey: "Peotta2015" });
    const titleMention = item({ title: "A comment on Peotta2015 and flat bands", citekey: "other1999" });
    const out = rankResults([titleMention, keyHit], "Peotta2015", { bibtexSearch: true });
    expect(out[0].title).toBe("Unrelated Title");
  });

  it("dedupes the same item (same id) appearing twice", () => {
    const a = item({ id: 42, key: "SAMEKEY", title: "Dup" });
    const b = { ...a };
    const out = rankResults([a, b], "", {});
    expect(out.filter((i) => i.id === 42)).toHaveLength(1);
  });

  it("keeps two distinct items that share a Zotero key across libraries", () => {
    // Zotero item keys are unique only within a library, so a personal item and
    // a group item can share a key while being different papers.
    const personal = item({ id: 10, key: "SAMEKEY", library: 1, title: "Personal" });
    const group = item({ id: 20, key: "SAMEKEY", library: 2, title: "Group" });
    const out = rankResults([personal, group], "", {});
    expect(out.map((i) => i.title).sort()).toEqual(["Group", "Personal"]);
  });

  it("keeps two items that share a key when the database id is missing", () => {
    const personal = item({ id: undefined, key: "SAMEKEY", library: 1, title: "Personal" });
    const group = item({ id: undefined, key: "SAMEKEY", library: 2, title: "Group" });
    const out = rankResults([personal, group], "", {});
    expect(out.map((i) => i.title).sort()).toEqual(["Group", "Personal"]);
  });

  it("matches a whole-word term inside a long abstract (substring, not subsequence)", () => {
    const hit = item({ title: "Unrelated", abstractNote: "a long discussion of superconductivity and more" });
    const out = rankResults([hit], "superconductivity", {});
    expect(out).toHaveLength(1);
  });

  it("does not fuzzy-subsequence-match scattered letters across a long abstract", () => {
    // 'xzqj' appears only as scattered letters; must NOT match (would be noise
    // and, when run over every item's abstract, the source of the OOM).
    const noise = item({ title: "Plain Title", abstractNote: "the quick brown fox jumps over the lazy zebra" });
    const out = rankResults([noise], "xzqj", {});
    expect(out).toHaveLength(0);
  });

  it("restricts to an allowed-collections set by collection key", () => {
    const inScope = item({ title: "Keep", collectionKeys: ["PHYSKEY"] });
    const outScope = item({ title: "Drop", collectionKeys: ["COOKKEY"] });
    const out = rankResults([inScope, outScope], "", { collections: ["PHYSKEY"] });
    expect(out.map((i) => i.title)).toEqual(["Keep"]);
  });

  it("does not conflate distinct collections that share a name (filters by key)", () => {
    // Two collections named "Papers" in different libraries have different keys.
    const a = item({ title: "A", collectionKeys: ["PAPERS_A"] });
    const b = item({ title: "B", collectionKeys: ["PAPERS_B"] });
    const out = rankResults([a, b], "", { collections: ["PAPERS_A"] });
    expect(out.map((i) => i.title)).toEqual(["A"]);
  });

  it("does not conflate collections that share a key across libraries", () => {
    const a = item({ title: "A", collectionKeys: ["1:SAMEKEY"] });
    const b = item({ title: "B", collectionKeys: ["2:SAMEKEY"] });
    const out = rankResults([a, b], "", { collections: ["1:SAMEKEY"] });
    expect(out.map((i) => i.title)).toEqual(["A"]);
  });

  it("restricts to an allowed-libraries set when provided (personal-only default)", () => {
    const personal = item({ title: "Mine", library: 1 });
    const group = item({ title: "Group", library: 2 });
    const out = rankResults([personal, group], "", { libraries: [1] });
    expect(out.map((i) => i.title)).toEqual(["Mine"]);
  });

  it("includes a selected group library alongside the personal one", () => {
    const personal = item({ title: "Mine", library: 1 });
    const group = item({ title: "Group", library: 2 });
    const other = item({ title: "OtherGroup", library: 3 });
    const out = rankResults([personal, group, other], "", { libraries: [1, 2] });
    expect(out.map((i) => i.title).sort()).toEqual(["Group", "Mine"]);
  });
});
