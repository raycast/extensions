import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
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
