import { describe, it, expect } from "vitest";
import { itemIdentity, zoteroSelectUri, zoteroOpenPdfUri } from "./library";
import type { RefData } from "./zoteroApi";

const userItem: RefData = { id: 10, key: "ABCD1234", library: 1, libraryType: "user" };
const groupItem: RefData = { id: 20, key: "WXYZ5678", library: 2, libraryType: "group", groupID: 6518241 };
const legacyItem: RefData = { key: "OLD0000", library: 1 }; // cache built before library fields existed

describe("itemIdentity", () => {
  it("prefers the globally unique database item id", () => {
    expect(itemIdentity(userItem)).toBe("id:10");
    expect(itemIdentity(groupItem)).toBe("id:20");
  });

  it("gives distinct ids to items that share a Zotero key across libraries", () => {
    const personal: RefData = { id: 10, key: "SAMEKEY", library: 1 };
    const group: RefData = { id: 20, key: "SAMEKEY", library: 2 };
    expect(itemIdentity(personal)).not.toBe(itemIdentity(group));
  });

  it("falls back to library+key when the database id is missing", () => {
    const personal: RefData = { key: "SAMEKEY", library: 1 };
    const group: RefData = { key: "SAMEKEY", library: 2 };
    expect(itemIdentity(personal)).toBe("1:SAMEKEY");
    expect(itemIdentity(group)).toBe("2:SAMEKEY");
  });
});

describe("zoteroSelectUri", () => {
  it("uses the /library/ path for personal-library items", () => {
    expect(zoteroSelectUri(userItem)).toBe("zotero://select/library/items/ABCD1234");
  });

  it("uses the /groups/<groupID>/ path for group-library items", () => {
    expect(zoteroSelectUri(groupItem)).toBe("zotero://select/groups/6518241/items/WXYZ5678");
  });

  it("falls back to the /library/ path when library metadata is missing", () => {
    expect(zoteroSelectUri(legacyItem)).toBe("zotero://select/library/items/OLD0000");
  });
});

describe("zoteroOpenPdfUri", () => {
  it("opens a personal-library attachment via /library/", () => {
    expect(zoteroOpenPdfUri(userItem, "PDFKEY1")).toBe("zotero://open-pdf/library/items/PDFKEY1");
  });

  it("opens a group-library attachment via /groups/<groupID>/", () => {
    expect(zoteroOpenPdfUri(groupItem, "PDFKEY2")).toBe("zotero://open-pdf/groups/6518241/items/PDFKEY2");
  });
});
