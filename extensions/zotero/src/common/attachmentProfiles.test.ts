import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync, symlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getLinkedAttachmentBasePath } from "./attachments";

const roots: string[] = [];
function profiles(entries: { name: string; base: string; dataDir?: string }[]): string {
  const root = mkdtempSync(join(tmpdir(), "raycast-zotero-profiles-"));
  roots.push(root);
  for (const entry of entries) {
    mkdirSync(join(root, entry.name));
    const prefs = [`user_pref("extensions.zotero.baseAttachmentPath", ${JSON.stringify(entry.base)});`];
    if (entry.dataDir) prefs.push(`user_pref("extensions.zotero.dataDir", ${JSON.stringify(entry.dataDir)});`);
    writeFileSync(join(root, entry.name, "prefs.js"), prefs.join("\n"));
  }
  return root;
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

it("chooses the matching data directory rather than the first profile", () => {
  const root = profiles([
    { name: "a-other", base: "/other-papers", dataDir: "/other-data" },
    { name: "b-match", base: "/papers with spaces", dataDir: "/data" },
  ]);
  expect(getLinkedAttachmentBasePath("/data/zotero.sqlite", root)).toBe("/papers with spaces");
});

it("does not use an unrelated profile's base directory", () => {
  const root = profiles([{ name: "other", base: "/other-papers", dataDir: "/other-data" }]);
  expect(getLinkedAttachmentBasePath("/data/zotero.sqlite", root)).toBeNull();
});

it("refuses ambiguous matching profiles", () => {
  const root = profiles([
    { name: "one", base: "/papers-one", dataDir: "/data" },
    { name: "two", base: "/papers-two", dataDir: "/data" },
  ]);
  expect(getLinkedAttachmentBasePath("/data/zotero.sqlite", root)).toBeNull();
});

it("supports Zotero's default data directory when the preference is absent", () => {
  vi.stubEnv("HOME", "/test-home");
  const root = profiles([{ name: "default", base: "/papers" }]);
  expect(getLinkedAttachmentBasePath("/test-home/Zotero/zotero.sqlite", root)).toBe("/papers");
});

it("matches symlinked data directories to the same physical folder", () => {
  const root = profiles([]);
  const data = join(root, "real-data");
  const link = join(root, "linked-data");
  mkdirSync(data);
  symlinkSync(data, link, "dir");
  const profileRoot = profiles([{ name: "match", base: "/papers", dataDir: data }]);
  expect(getLinkedAttachmentBasePath(join(link, "zotero.sqlite"), profileRoot)).toBe("/papers");
  const reverseRoot = profiles([{ name: "match", base: "/papers", dataDir: link }]);
  expect(getLinkedAttachmentBasePath(join(data, "zotero.sqlite"), reverseRoot)).toBe("/papers");
});

it("treats symlinked base directories pointing to the same folder as unambiguous", () => {
  const root = profiles([]);
  const papers = join(root, "papers");
  const link = join(root, "linked-papers");
  mkdirSync(papers);
  symlinkSync(papers, link, "dir");
  const profileRoot = profiles([
    { name: "one", base: papers, dataDir: "/data" },
    { name: "two", base: link, dataDir: "/data" },
  ]);
  expect(getLinkedAttachmentBasePath("/data/zotero.sqlite", profileRoot)).toBe(realpathSync(papers));
});

it("refreshes successful lookups after profile settings change", () => {
  vi.useFakeTimers();
  const root = profiles([{ name: "match", base: "/old-papers", dataDir: "/data" }]);
  expect(getLinkedAttachmentBasePath("/data/zotero.sqlite", root)).toBe("/old-papers");
  writeFileSync(
    join(root, "match", "prefs.js"),
    'user_pref("extensions.zotero.baseAttachmentPath", "/new-papers");\nuser_pref("extensions.zotero.dataDir", "/data");',
  );
  vi.advanceTimersByTime(5_001);
  expect(getLinkedAttachmentBasePath("/data/zotero.sqlite", root)).toBe("/new-papers");
});

it("retries unavailable profile reads instead of caching null for the command lifetime", () => {
  vi.useFakeTimers();
  const root = profiles([{ name: "match", base: "/papers", dataDir: "/data" }]);
  const prefsPath = join(root, "match", "prefs.js");
  // Reading a directory as a file fails consistently, even with elevated test permissions.
  rmSync(prefsPath);
  mkdirSync(prefsPath);
  expect(getLinkedAttachmentBasePath("/data/zotero.sqlite", root)).toBeNull();
  rmSync(prefsPath, { recursive: true });
  writeFileSync(
    prefsPath,
    'user_pref("extensions.zotero.baseAttachmentPath", "/papers");\nuser_pref("extensions.zotero.dataDir", "/data");',
  );
  vi.advanceTimersByTime(5_001);
  expect(getLinkedAttachmentBasePath("/data/zotero.sqlite", root)).toBe("/papers");
});
