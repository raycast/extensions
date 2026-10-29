import { describe, it, expect } from "vitest";
import { buildCollectionOptions, visibleCollectionOptions, collectionId } from "./collections";

describe("buildCollectionOptions", () => {
  it("leaves unique names untouched but qualifies keys by library", () => {
    const opts = buildCollectionOptions(
      [
        { key: "K1", name: "Physics", library: 1 },
        { key: "K2", name: "Cooking", library: 1 },
      ],
      new Map([[1, "My Library"]]),
    );
    expect(opts).toEqual([
      { key: "1:K1", title: "Physics" },
      { key: "1:K2", title: "Cooking" },
    ]);
  });

  it("disambiguates same-named collections in different libraries by library name", () => {
    const opts = buildCollectionOptions(
      [
        { key: "K1", name: "Papers", library: 1 },
        { key: "K2", name: "Papers", library: 2 },
      ],
      new Map([
        [1, "My Library"],
        [2, "Group A"],
      ]),
    );
    const byKey = Object.fromEntries(opts.map((o) => [o.key, o.title]));
    expect(byKey["1:K1"]).toBe("Papers (My Library)");
    expect(byKey["2:K2"]).toBe("Papers (Group A)");
  });

  it("keeps titles unique even when same-named collections live in the same library", () => {
    const opts = buildCollectionOptions(
      [
        { key: "AAAA1111", name: "Notes", library: 1 },
        { key: "BBBB2222", name: "Notes", library: 1 },
      ],
      new Map([[1, "My Library"]]),
    );
    const titles = opts.map((o) => o.title);
    expect(new Set(titles).size).toBe(2); // no two options share a title
    expect(titles.every((t) => !t.includes("(My Library)"))).toBe(true);
  });

  it("gives distinct ids to collections that share a key across libraries", () => {
    const opts = buildCollectionOptions(
      [
        { key: "SAMEKEY", name: "Alpha", library: 1 },
        { key: "SAMEKEY", name: "Beta", library: 2 },
      ],
      new Map([
        [1, "My Library"],
        [2, "Group A"],
      ]),
    );
    const keys = opts.map((o) => o.key);
    expect(keys).toEqual(["1:SAMEKEY", "2:SAMEKEY"]);
    expect(new Set(keys).size).toBe(2);
  });
});

describe("collectionId", () => {
  it("qualifies a collection key with its library id", () => {
    expect(collectionId(2, "ABCD")).toBe("2:ABCD");
  });
});

describe("visibleCollectionOptions", () => {
  const cols = [
    { key: "P1", name: "Personal", library: 1 },
    { key: "G1", name: "GroupOne", library: 2 },
    { key: "G2", name: "GroupTwo", library: 3 },
  ];
  const names = new Map([
    [1, "My Library"],
    [2, "Group A"],
    [3, "Group B"],
  ]);

  it("shows only personal collections when no groups are included", () => {
    const opts = visibleCollectionOptions(cols, [1], names);
    expect(opts.map((o) => o.key)).toEqual(["1:P1"]);
  });

  it("adds collections from an included group", () => {
    const opts = visibleCollectionOptions(cols, [1, 2], names);
    expect(opts.map((o) => o.key).sort()).toEqual(["1:P1", "2:G1"]);
  });

  it("omits collections from a group that is not included", () => {
    const opts = visibleCollectionOptions(cols, [1, 2], names);
    expect(opts.some((o) => o.key === "3:G2")).toBe(false);
  });
});
