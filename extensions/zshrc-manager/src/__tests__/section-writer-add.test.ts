/**
 * Tests for the write half of lib/section-writer.ts — adding collection
 * aliases into an existing or new section. (The matching half is covered
 * in section-writer.test.ts.)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReadRaw = vi.fn();
const mockWrite = vi.fn();
vi.mock("../lib/zsh", () => ({
  readZshrcFileRaw: (...args: unknown[]) => mockReadRaw(...args),
  writeZshrcFile: (...args: unknown[]) => mockWrite(...args),
  getZshrcPath: vi.fn(() => "/t/.zshrc"),
}));
vi.mock("../lib/history", () => ({ saveToHistory: vi.fn().mockResolvedValue(undefined) }));
import { addAliasesToZshrc, addSingleAliasToZshrc, formatAliasLines } from "../lib/section-writer";

const ALIASES = [
  { name: "g", value: "git", description: "shortcut" },
  { name: "ga", value: "git add" },
];

describe("section-writer write path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("formatAliasLines", () => {
    it("emits alias lines with comments when requested", () => {
      const lines = formatAliasLines(ALIASES, true);
      expect(lines.some((line) => line.includes("alias g='git'"))).toBe(true);
      expect(lines.some((line) => line.includes("shortcut"))).toBe(true);
    });

    it("omits comments when disabled", () => {
      const lines = formatAliasLines(ALIASES, false);
      expect(lines.join("\n")).not.toContain("shortcut");
    });
  });

  describe("addAliasesToZshrc", () => {
    it("appends into an existing matching section", async () => {
      mockReadRaw.mockResolvedValue(["# --- Git --- #", "alias gs='git status'", "", "# --- End --- #"].join("\n"));

      const result = await addAliasesToZshrc("Git Aliases", ALIASES, "collection");
      expect(result.success).toBe(true);
      expect(result.addedTo).toBe("existing");

      const written = mockWrite.mock.calls[0]![0] as string;
      expect(written).toContain("alias g='git'");
      expect(written).toContain("# Added from Git Aliases (collection)");
    });

    it("creates a new section when nothing matches", async () => {
      mockReadRaw.mockResolvedValue("alias unrelated='x'\n");

      const result = await addAliasesToZshrc("Kubernetes", ALIASES);
      expect(result.success).toBe(true);
      expect(result.addedTo).toBe("new");
      expect(result.sectionName).toBe("Kubernetes");

      const written = mockWrite.mock.calls[0]![0] as string;
      expect(written).toContain("Kubernetes");
      expect(written).toContain("alias ga='git add'");
    });

    it("starts from empty content when the file is unreadable", async () => {
      mockReadRaw.mockRejectedValue(new Error("missing"));

      const result = await addAliasesToZshrc("Fresh", ALIASES);
      expect(result.success).toBe(true);
      expect(result.addedTo).toBe("new");
      expect(mockWrite).toHaveBeenCalled();
    });
  });

  describe("addSingleAliasToZshrc", () => {
    it("writes a single alias", async () => {
      mockReadRaw.mockResolvedValue("# --- Tools --- #\nalias t='true'\n");

      const result = await addSingleAliasToZshrc({ name: "gl", value: "git log" }, "Tools");
      expect(result.success).toBe(true);
      const written = mockWrite.mock.calls[0]![0] as string;
      expect(written).toContain("alias gl='git log'");
    });
  });
});
