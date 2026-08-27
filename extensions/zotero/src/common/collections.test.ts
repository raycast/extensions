import { describe, it, expect } from "vitest";
import { buildCollectionOptions } from "./collections";

describe("buildCollectionOptions", () => {
  it("leaves unique names untouched", () => {
    const opts = buildCollectionOptions(
      [
        { key: "K1", name: "Physics", library: 1 },
        { key: "K2", name: "Cooking", library: 1 },
      ],
      new Map([[1, "My Library"]]),
    );
    expect(opts).toEqual([
      { key: "K1", title: "Physics" },
      { key: "K2", title: "Cooking" },
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
    expect(byKey["K1"]).toBe("Papers (My Library)");
    expect(byKey["K2"]).toBe("Papers (Group A)");
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
    expect(opts.every((o) => o.key)).toBe(true);
    // Same-library collisions should not carry a redundant library-name suffix.
    expect(titles.every((t) => !t.includes("(My Library)"))).toBe(true);
  });
});
