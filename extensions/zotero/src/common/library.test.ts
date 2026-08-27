import { describe, it, expect } from "vitest";
import { zoteroSelectUri, zoteroOpenPdfUri } from "./library";
import type { RefData } from "./zoteroApi";

const userItem: RefData = { key: "ABCD1234", library: 1, libraryType: "user" };
const groupItem: RefData = { key: "WXYZ5678", library: 2, libraryType: "group", groupID: 6518241 };
const legacyItem: RefData = { key: "OLD0000", library: 1 }; // cache built before library fields existed

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
