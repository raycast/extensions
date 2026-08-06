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
import { saveToHistory } from "../lib/history";

/**
 * The history contract every write shares: the snapshot recorded is the
 * PRE-change content, and it is recorded only after the write happened
 * (so a failed write leaves no bogus undo point).
 */
function expectHistoryRecordedAfterWrite(previousContent: string): void {
  const history = vi.mocked(saveToHistory);
  expect(history).toHaveBeenCalledTimes(1);
  expect(history.mock.calls[0]![1]).toBe(previousContent);
  expect(mockWrite.mock.invocationCallOrder[0]!).toBeLessThan(history.mock.invocationCallOrder[0]!);
}

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
      const previous = ["# --- Git --- #", "alias gs='git status'", "", "# --- End --- #"].join("\n");
      mockReadRaw.mockResolvedValue(previous);

      const result = await addAliasesToZshrc("Git Aliases", ALIASES, "collection");
      expect(result.success).toBe(true);
      expect(result.addedTo).toBe("existing");

      const written = mockWrite.mock.calls[0]![0] as string;
      expect(written).toContain("alias g='git'");
      expect(written).toContain("# Added from Git Aliases (collection)");
      expectHistoryRecordedAfterWrite(previous);
    });

    it("creates a new section when nothing matches", async () => {
      const previous = "alias unrelated='x'\n";
      mockReadRaw.mockResolvedValue(previous);

      const result = await addAliasesToZshrc("Kubernetes", ALIASES);
      expect(result.success).toBe(true);
      expect(result.addedTo).toBe("new");
      expect(result.sectionName).toBe("Kubernetes");

      const written = mockWrite.mock.calls[0]![0] as string;
      expect(written).toContain("Kubernetes");
      expect(written).toContain("alias ga='git add'");
      expectHistoryRecordedAfterWrite(previous);
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
      const previous = "# --- Tools --- #\nalias t='true'\n";
      mockReadRaw.mockResolvedValue(previous);

      const result = await addSingleAliasToZshrc({ name: "gl", value: "git log" }, "Tools");
      expect(result.success).toBe(true);
      const written = mockWrite.mock.calls[0]![0] as string;
      expect(written).toContain("alias gl='git log'");
      expectHistoryRecordedAfterWrite(previous);
    });
  });
});
