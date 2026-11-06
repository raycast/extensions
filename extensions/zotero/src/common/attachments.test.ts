import { describe, it, expect, vi, afterEach } from "vitest";
import { attachmentPath, resolveAttachmentPath, secondaryAttachments } from "./attachments";
import type { RefData, Attachment } from "./zoteroApi";

const att = (key: string, path: string): Attachment => ({ key, path, title: path, url: "" });

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

describe("secondaryAttachments", () => {
  it("returns every pdf attachment except the primary (first, oldest)", () => {
    const item: RefData = {
      id: 5,
      key: "ITEM0005",
      library: 1,
      libraryType: "user",
      attachment: att("PRIMARY1", "storage:main.pdf"),
      attachments: [
        att("PRIMARY1", "storage:main.pdf"),
        att("SEC00001", "storage:suppmat.pdf"),
        att("SEC00002", "storage:appendix.pdf"),
      ],
    };
    expect(secondaryAttachments(item)).toEqual([
      att("SEC00001", "storage:suppmat.pdf"),
      att("SEC00002", "storage:appendix.pdf"),
    ]);
  });

  it("returns no secondaries for an entry with a single pdf", () => {
    expect(secondaryAttachments(itemWithStorageAttachment)).toEqual([]);
  });

  it("returns no secondaries when the entry has no pdf", () => {
    expect(secondaryAttachments({ id: 6, key: "ITEM0006", library: 1 })).toEqual([]);
  });

  it("returns no secondaries for a cache entry that predates multi-attachment support", () => {
    const legacy: RefData = { id: 7, key: "ITEM0007", library: 1, attachment: att("OLDKEY1", "storage:main.pdf") };
    expect(secondaryAttachments(legacy)).toEqual([]);
  });
});

describe("relative linked attachment paths", () => {
  it("resolves the primary PDF relative to the linked attachment base directory", () => {
    const item: RefData = { attachment: att("LINK0001", "attachments:papers/文献 one.pdf") };
    expect(resolveAttachmentPath(item, "/data/zotero.sqlite", "/linked papers")).toBe(
      "/linked papers/papers/文献 one.pdf",
    );
  });

  it("uses the same resolution for secondary PDFs", () => {
    const primary = att("PRIMARY1", "storage:main.pdf");
    const secondary = att("SECOND01", "attachments:appendix.pdf");
    const item: RefData = { attachment: primary, attachments: [primary, secondary] };
    expect(secondaryAttachments(item).map((a) => attachmentPath(a, "/data/zotero.sqlite", "/linked"))).toEqual([
      "/linked/appendix.pdf",
    ]);
  });

  it("leaves a relative attachment unresolved if no matching base directory is available", () => {
    expect(attachmentPath(att("LINK0001", "attachments:paper.pdf"), "/data/zotero.sqlite", null)).toBeNull();
  });

  it("preserves literal percent escapes in filesystem names", () => {
    expect(attachmentPath(att("LINK0001", "attachments:paper%20one.pdf"), "/data/zotero.sqlite", "/linked")).toBe(
      "/linked/paper%20one.pdf",
    );
    expect(attachmentPath(att("LINK0001", "/linked/paper%20one.pdf"), "/data/zotero.sqlite")).toBe(
      "/linked/paper%20one.pdf",
    );
  });
});
