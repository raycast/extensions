/**
 * Integration tests using realistic zshrc fixtures
 *
 * These tests verify that the parser correctly handles
 * real-world zshrc configurations without mocking.
 */

import { describe, it, expect } from "vitest";
import { parseZshrc, toLogicalSections } from "../lib/parse-zshrc";
import {
  parseAliases,
  parseExports,
  parseFunctions,
  parsePlugins,
  parseSources,
  parseSetopts,
  parseEvals,
} from "../utils/parsers";
import {
  OhMyZshConfig,
  MinimalWithEdgeCases,
  ConfigWithIssues,
  MixedSectionFormats,
  EmptyConfig,
  UnicodeConfig,
} from "./fixtures/realistic-zshrc";
import { detectDuplicates } from "../utils/validation";
import { computeDiff } from "../utils/diff";

describe("Integration: Realistic Zshrc Parsing", () => {
  describe("Oh-My-Zsh Configuration", () => {
    it("should parse all aliases correctly", () => {
      const aliases = parseAliases(OhMyZshConfig);

      expect(aliases.length).toBeGreaterThan(15);
      expect(aliases.some((a) => a.name === "ll")).toBe(true);
      expect(aliases.some((a) => a.name === "gs")).toBe(true);
      expect(aliases.some((a) => a.name === "dc")).toBe(true);
    });

    it("should parse exports correctly", () => {
      const exports = parseExports(OhMyZshConfig);

      expect(exports.length).toBeGreaterThan(5);
      expect(exports.some((e) => e.variable === "EDITOR")).toBe(true);
      expect(exports.some((e) => e.variable === "PATH")).toBe(true);
      expect(exports.some((e) => e.variable === "NVM_DIR")).toBe(true);
    });

    it("should parse functions correctly", () => {
      const functions = parseFunctions(OhMyZshConfig);

      expect(functions.length).toBe(2);
      expect(functions.some((f) => f.name === "mkcd")).toBe(true);
      expect(functions.some((f) => f.name === "extract")).toBe(true);
    });

    it("should parse plugins correctly", () => {
      const plugins = parsePlugins(OhMyZshConfig);

      expect(plugins.length).toBeGreaterThan(5);
      expect(plugins.some((p) => p.name === "git")).toBe(true);
      expect(plugins.some((p) => p.name === "docker")).toBe(true);
    });

    it("should parse setopts correctly", () => {
      const setopts = parseSetopts(OhMyZshConfig);

      expect(setopts.length).toBe(3);
      expect(setopts.some((s) => s.option === "SHARE_HISTORY")).toBe(true);
    });

    it("should parse evals correctly", () => {
      const evals = parseEvals(OhMyZshConfig);

      expect(evals.length).toBe(2);
      expect(evals.some((e) => e.command.includes("pyenv"))).toBe(true);
    });

    it("should detect logical sections", () => {
      const sections = toLogicalSections(OhMyZshConfig);

      // At minimum, should have one section (even if unlabeled)
      expect(sections.length).toBeGreaterThan(0);
      // The dashed section format should be detected
      expect(sections.some((s) => s.label !== "Unlabeled")).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle aliases with special characters", () => {
      const aliases = parseAliases(MinimalWithEdgeCases);

      expect(aliases.some((a) => a.name === "grep")).toBe(true);
      expect(aliases.some((a) => a.name === "ll")).toBe(true);
      expect(aliases.some((a) => a.name === "psg")).toBe(true);
    });

    it("should handle sources with variables", () => {
      const sources = parseSources(MinimalWithEdgeCases);

      expect(sources.some((s) => s.path.includes("$HOME"))).toBe(true);
      expect(sources.some((s) => s.path.includes("~"))).toBe(true);
    });

    it("should handle empty configuration", () => {
      const entries = parseZshrc(EmptyConfig);

      // Should parse without errors, minimal entries
      expect(entries.length).toBeLessThan(5);
    });

    it("should handle unicode content", () => {
      const aliases = parseAliases(UnicodeConfig);

      expect(aliases.length).toBeGreaterThan(0);
      // Parser should not crash on unicode
    });
  });

  describe("Configuration with Issues", () => {
    it("should detect duplicate aliases", () => {
      const aliases = parseAliases(ConfigWithIssues);
      const aliasesWithSection = aliases.map((a) => ({ ...a, section: "test" }));
      const duplicates = detectDuplicates(aliasesWithSection, "name");

      expect(duplicates.totalDuplicates).toBeGreaterThan(0);
      expect(duplicates.duplicates.some((d) => d.name === "ll")).toBe(true);
    });
  });

  describe("Mixed Section Formats", () => {
    it("should detect all section types", () => {
      const sections = toLogicalSections(MixedSectionFormats);

      // Should recognize at least one labeled section
      expect(sections.length).toBeGreaterThan(0);
      // At least one section should have a label (not "Unlabeled")
      expect(sections.some((s) => s.label !== "Unlabeled")).toBe(true);
    });

    it("should parse entries within each section", () => {
      const entries = parseZshrc(MixedSectionFormats);
      const aliases = entries.filter((e) => e.type === "alias");

      expect(aliases.length).toBe(5);
    });
  });
});

describe("Integration: Diff Utility", () => {
  it("should compute diff for simple changes", () => {
    const original = "alias ll='ls -l'\nalias la='ls -a'";
    const modified = "alias ll='ls -la'\nalias la='ls -a'";

    const diff = computeDiff(original, modified);

    expect(diff.hasChanges).toBe(true);
    expect(diff.additions).toBeGreaterThan(0);
    expect(diff.deletions).toBeGreaterThan(0);
  });

  it("should return no changes for identical content", () => {
    const content = "alias ll='ls -l'";
    const diff = computeDiff(content, content);

    expect(diff.hasChanges).toBe(false);
    expect(diff.additions).toBe(0);
    expect(diff.deletions).toBe(0);
  });

  it("should generate valid markdown", () => {
    const original = "alias a='1'";
    const modified = "alias a='2'";

    const diff = computeDiff(original, modified);

    expect(diff.markdown).toContain("```diff");
    expect(diff.markdown).toContain("```");
  });
});

describe("Integration: Full Parse Pipeline", () => {
  it("should handle complete Oh-My-Zsh config end-to-end", () => {
    // Parse into entries
    const entries = parseZshrc(OhMyZshConfig);

    // Group into sections
    const sections = toLogicalSections(OhMyZshConfig);

    // Verify consistent results
    const totalAliasCount = sections.reduce((sum, s) => sum + s.aliasCount, 0);
    const aliasEntries = entries.filter((e) => e.type === "alias");

    // Counts should be close (minor differences due to section overlap handling)
    expect(Math.abs(totalAliasCount - aliasEntries.length)).toBeLessThan(5);
  });

  it("should maintain line number accuracy", () => {
    const simpleConfig = `alias a='1'
alias b='2'
alias c='3'`;

    const entries = parseZshrc(simpleConfig);
    const aliasEntries = entries.filter((e) => e.type === "alias");

    expect(aliasEntries[0]?.lineNumber).toBe(1);
    expect(aliasEntries[1]?.lineNumber).toBe(2);
    expect(aliasEntries[2]?.lineNumber).toBe(3);
  });
});

describe("Integration: Performance", () => {
  it("should handle large configurations efficiently", () => {
    // Generate a large config
    const largeConfig = Array.from({ length: 500 }, (_, i) => `alias test${i}='echo ${i}'`).join("\n");

    const startTime = performance.now();
    const entries = parseZshrc(largeConfig);
    const endTime = performance.now();

    expect(entries.length).toBe(500);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
  });

  it("should handle long lines without hanging (ReDoS protection)", () => {
    // Create a line that would trigger ReDoS in unprotected regex
    const longLine = "alias test='" + "x".repeat(2000) + "'";
    const config = `alias normal='cmd'\n${longLine}\nalias another='cmd2'`;

    const startTime = performance.now();
    const entries = parseZshrc(config);
    const endTime = performance.now();

    // Should complete quickly even with long line
    expect(endTime - startTime).toBeLessThan(500);
    // Long line should be handled (skipped or truncated)
    expect(entries.length).toBeGreaterThanOrEqual(2);
  });
});
