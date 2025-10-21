/**
 * Tests for statistics utility module
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateStatistics,
  hasContent,
  getTotalEntryCount,
  getTopEntries,
  ZshrcStatistics,
} from "../../utils/statistics";
import { LogicalSection } from "../../lib/parse-zshrc";

// Mock data factory
const createMockSection = (
  label: string,
  content: string,
  startLine: number = 1,
  endLine: number = 10,
): LogicalSection => ({
  label,
  startLine,
  endLine,
  content,
  aliasCount: 0,
  exportCount: 0,
  evalCount: 0,
  setoptCount: 0,
  pluginCount: 0,
  functionCount: 0,
  sourceCount: 0,
  autoloadCount: 0,
  fpathCount: 0,
  pathCount: 0,
  themeCount: 0,
  completionCount: 0,
  historyCount: 0,
  keybindingCount: 0,
  otherCount: 0,
});

describe("statistics.ts", () => {
  describe("calculateStatistics", () => {
    it("should return empty statistics for empty sections", () => {
      const stats = calculateStatistics([]);

      expect(stats.sectionCount).toBe(0);
      expect(stats.aliases).toHaveLength(0);
      expect(stats.exports).toHaveLength(0);
      expect(stats.evals).toHaveLength(0);
      expect(stats.setopts).toHaveLength(0);
      expect(stats.plugins).toHaveLength(0);
      expect(stats.functions).toHaveLength(0);
      expect(stats.sources).toHaveLength(0);
    });

    it("should parse aliases from sections", () => {
      const sections = [
        createMockSection("Test", "alias ll='ls -la'\nalias gs='git status'"),
      ];

      const stats = calculateStatistics(sections);

      expect(stats.aliases).toHaveLength(2);
      expect(stats.aliases[0]?.name).toBe("ll");
      expect(stats.aliases[1]?.name).toBe("gs");
    });

    it("should parse exports from sections", () => {
      const sections = [
        createMockSection(
          "Test",
          "export PATH=/usr/local/bin\nexport LANG=en_US.UTF-8",
        ),
      ];

      const stats = calculateStatistics(sections);

      expect(stats.exports).toHaveLength(2);
      expect(stats.exports[0]?.variable).toBe("PATH");
      expect(stats.exports[1]?.variable).toBe("LANG");
    });

    it("should aggregate entries across multiple sections", () => {
      const sections = [
        createMockSection("Section1", "alias ll='ls -la'\nexport A=1", 1, 5),
        createMockSection(
          "Section2",
          "alias gs='git status'\nexport B=2",
          6,
          10,
        ),
      ];

      const stats = calculateStatistics(sections);

      expect(stats.sectionCount).toBe(2);
      expect(stats.aliases).toHaveLength(2);
      expect(stats.exports).toHaveLength(2);
    });

    it("should handle mixed content in sections", () => {
      const sections = [
        createMockSection(
          "Mixed",
          `alias ll='ls -la'
export PATH=/usr/bin
eval "$(rbenv init -)"
setopt autocd`,
        ),
      ];

      const stats = calculateStatistics(sections);

      expect(stats.aliases.length).toBeGreaterThan(0);
      expect(stats.exports.length).toBeGreaterThan(0);
      expect(stats.evals.length).toBeGreaterThan(0);
      expect(stats.setopts.length).toBeGreaterThan(0);
    });

    it("should count sections correctly", () => {
      const sections = [
        createMockSection("Section1", "alias a='a'"),
        createMockSection("Section2", "alias b='b'"),
        createMockSection("Section3", "alias c='c'"),
      ];

      const stats = calculateStatistics(sections);

      expect(stats.sectionCount).toBe(3);
    });
  });

  describe("hasContent", () => {
    let emptyStats: ZshrcStatistics;
    let filledStats: ZshrcStatistics;

    beforeEach(() => {
      emptyStats = calculateStatistics([]);

      const sections = [
        createMockSection(
          "Full",
          `alias ll='ls -la'
export A=1
eval "command"
setopt opt
plugin plug
function fn() {}
source file`,
        ),
      ];
      filledStats = calculateStatistics(sections);
    });

    it("should return false for empty content", () => {
      expect(hasContent(emptyStats, "aliases")).toBe(false);
      expect(hasContent(emptyStats, "exports")).toBe(false);
      expect(hasContent(emptyStats, "evals")).toBe(false);
    });

    it("should return true for non-empty content", () => {
      expect(hasContent(filledStats, "aliases")).toBe(true);
      expect(hasContent(filledStats, "exports")).toBe(true);
      expect(hasContent(filledStats, "evals")).toBe(true);
    });

    it("should handle all content types", () => {
      const types: Array<keyof Omit<ZshrcStatistics, "sectionCount">> = [
        "aliases",
        "exports",
        "evals",
        "setopts",
        "plugins",
        "functions",
        "sources",
      ];

      types.forEach((type) => {
        const result = hasContent(filledStats, type);
        expect(typeof result).toBe("boolean");
      });
    });
  });

  describe("getTotalEntryCount", () => {
    it("should return 0 for empty statistics", () => {
      const stats = calculateStatistics([]);
      const total = getTotalEntryCount(stats);

      expect(total).toBe(0);
    });

    it("should sum all entry types", () => {
      const sections = [
        createMockSection(
          "Test",
          `alias a='a'
alias b='b'
export X=1
export Y=2
eval "cmd"
setopt opt`,
        ),
      ];

      const stats = calculateStatistics(sections);
      const total = getTotalEntryCount(stats);

      // Should be: 2 aliases + 2 exports + 1 eval + 1 setopt = 6
      expect(total).toBe(6);
    });

    it("should only count entries that exist", () => {
      const sections = [
        createMockSection("OnlyAliases", "alias a='a'\nalias b='b'"),
      ];

      const stats = calculateStatistics(sections);
      const total = getTotalEntryCount(stats);

      expect(total).toBe(2);
    });
  });

  describe("getTopEntries", () => {
    it("should return all entries when count is higher than array length", () => {
      const entries = [1, 2, 3];
      const result = getTopEntries(entries, 10);

      expect(result).toHaveLength(3);
      expect(result).toEqual([1, 2, 3]);
    });

    it("should return requested number of entries", () => {
      const entries = Array.from({ length: 20 }, (_, i) => i);
      const result = getTopEntries(entries, 5);

      expect(result).toHaveLength(5);
      expect(result).toEqual([0, 1, 2, 3, 4]);
    });

    it("should use default count of 10", () => {
      const entries = Array.from({ length: 20 }, (_, i) => i);
      const result = getTopEntries(entries);

      expect(result).toHaveLength(10);
    });

    it("should return empty array for empty input", () => {
      const result = getTopEntries([], 5);

      expect(result).toHaveLength(0);
    });

    it("should preserve order from source array", () => {
      const entries = ["z", "a", "m", "b"];
      const result = getTopEntries(entries, 2);

      expect(result).toEqual(["z", "a"]);
    });

    it("should work with objects", () => {
      const entries = [
        { id: 1, name: "First" },
        { id: 2, name: "Second" },
        { id: 3, name: "Third" },
      ];

      const result = getTopEntries(entries, 2);

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(1);
      expect(result[1]?.id).toBe(2);
    });

    it("should handle count of 0", () => {
      const entries = [1, 2, 3];
      const result = getTopEntries(entries, 0);

      expect(result).toHaveLength(0);
    });

    it("should handle count of 1", () => {
      const entries = [1, 2, 3];
      const result = getTopEntries(entries, 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(1);
    });
  });
});
