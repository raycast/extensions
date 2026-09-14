import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveAttachmentPath } from "./attachments";
import type { RefData } from "./zoteroApi";

const itemWithStorageAttachment: RefData = {
  id: 1,
  key: "ITEM1234",
  library: 1,
  libraryType: "user",
  attachment: { key: "ATTY5678", path: "storage:paper.pdf", title: "paper.pdf", url: "" },
};

describe("resolveAttachmentPath", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("resolves a storage: attachment to <zotero dir>/storage/<attachment key>/<filename>", () => {
    const p = resolveAttachmentPath(itemWithStorageAttachment, "/Users/isaac/Zotero/zotero.sqlite");
    expect(p).toBe("/Users/isaac/Zotero/storage/ATTY5678/paper.pdf");
  });

  it("returns linked (non-storage) attachment paths unchanged", () => {
    const linked: RefData = {
      id: 2,
      key: "ITEM9999",
      library: 1,
      libraryType: "user",
      attachment: { key: "LINK0001", path: "/Volumes/Papers/dissertation.pdf", title: "dissertation.pdf", url: "" },
    };
    expect(resolveAttachmentPath(linked, "/Users/isaac/Zotero/zotero.sqlite")).toBe("/Volumes/Papers/dissertation.pdf");
  });

  it("returns null when the reference has no attachment or an empty attachment key", () => {
    const noAttachment: RefData = { id: 3, key: "ITEM0003", library: 1, libraryType: "user" };
    const emptyKey: RefData = {
      id: 4,
      key: "ITEM0004",
      library: 1,
      libraryType: "user",
      attachment: { key: "", path: "storage:paper.pdf", title: "paper.pdf", url: "" },
    };
    expect(resolveAttachmentPath(noAttachment, "/Users/isaac/Zotero/zotero.sqlite")).toBeNull();
    expect(resolveAttachmentPath(emptyKey, "/Users/isaac/Zotero/zotero.sqlite")).toBeNull();
  });

  it("expands a ~ in the zotero path before joining the storage dir", () => {
    vi.stubEnv("HOME", "/fake/home");
    const p = resolveAttachmentPath(itemWithStorageAttachment, "~/Zotero/zotero.sqlite");
    expect(p).toBe("/fake/home/Zotero/storage/ATTY5678/paper.pdf");
  });
});
