/**
 * Tests for lib/edit-item-write.ts — the pure content computation behind
 * every save, move, and delete. These functions decide exactly what gets
 * written to the user's shell config, so every branch is covered:
 * insertion into existing/missing sections, in-place updates preserving
 * whitespace and comments, section moves, deletes, and the fail-closed
 * refusals.
 */

import { describe, it, expect } from "vitest";
import {
  computeDeletedContent,
  computeUpdatedContent,
  insertIntoSection,
  preservingReplacer,
  scopedFailureMessage,
  type EditItemConfig,
} from "../lib/edit-item-write";

/** Alias config mirroring src/edit-alias.tsx */
const aliasConfig: EditItemConfig = {
  keyLabel: "Alias Name",
  valueLabel: "Command",
  keyPlaceholder: "e.g., ll",
  valuePlaceholder: "e.g., ls -la",
  keyPattern: /^[A-Za-z0-9_.:-]+$/,
  keyValidationError: "Invalid alias name",
  generateLine: (key, value) => `alias ${key}='${value}'`,
  generatePattern: (key) => new RegExp(`^(\\s*)alias\\s+${key}=(?:'|")(.*?)(?:'|")(\\s*#.*)?$`),
  generateReplacement: (key, value) => `alias ${key}='${value}'`,
  matchesDisplayLine: (line, key) => new RegExp(`^\\s*alias\\s+${key}=(?:'|")(.*?)(?:'|")\\s*(#.*)?$`).test(line),
  itemType: "alias",
  itemTypeCapitalized: "Alias",
};

const CONTENT = [
  "# Section: Tools",
  "alias gg='git grep'",
  "alias gs='git status'",
  "",
  "# Section: Misc",
  "alias m='make'",
].join("\n");

describe("edit-item-write.ts", () => {
  describe("insertIntoSection", () => {
    it("inserts after the last non-empty line of an existing section", () => {
      const result = insertIntoSection(CONTENT, "Tools", "alias new='x'");
      const lines = result.split("\n");
      expect(lines[lines.indexOf("alias gs='git status'") + 1]).toBe("alias new='x'");
      // The other section is untouched
      expect(result).toContain("# Section: Misc\nalias m='make'");
    });

    it("creates a missing section at the end of the file", () => {
      const result = insertIntoSection(CONTENT, "Brand New", "alias new='x'");
      expect(result.endsWith("# --- Brand New --- #\nalias new='x'")).toBe(true);
    });

    it("appends without a trailing newline when the section ends the file", () => {
      const result = insertIntoSection(CONTENT, "Misc", "alias new='x'");
      expect(result.endsWith("alias m='make'\nalias new='x'")).toBe(true);
    });

    it("a section-like comment inside an array is not an insertion target", () => {
      const content = ["# Section: Plugins", "plugins=(", "  git", "  ## extras", "  docker", ")"].join("\n");
      const result = insertIntoSection(content, "extras", "alias new='x'");
      // "extras" does not exist as a section — the array must stay intact
      // and the new section is created at the end of the file.
      expect(result).toContain("plugins=(\n  git\n  ## extras\n  docker\n)");
      expect(result.endsWith("# --- extras --- #\nalias new='x'")).toBe(true);
    });
  });

  describe("preservingReplacer", () => {
    it("preserves leading whitespace and inline comment", () => {
      const pattern = aliasConfig.generatePattern("gg");
      const replace = preservingReplacer(pattern, "alias gg='new value'");
      expect(replace("  alias gg='old' # keep me")).toBe("  alias gg='new value' # keep me");
    });
  });

  describe("computeUpdatedContent — add", () => {
    it("adds a new item into the target section", () => {
      const result = computeUpdatedContent(CONTENT, {
        config: aliasConfig,
        key: "gl",
        value: "git log",
        targetSection: "Tools",
        isEditing: false,
      });
      expect(result).toContain("alias gl='git log'");
      expect(result.indexOf("alias gl=")).toBeGreaterThan(result.indexOf("alias gs="));
      expect(result.indexOf("alias gl=")).toBeLessThan(result.indexOf("# Section: Misc"));
    });
  });

  describe("computeUpdatedContent — edit in place", () => {
    it("updates the definition without touching anything else", () => {
      const result = computeUpdatedContent(CONTENT, {
        config: aliasConfig,
        key: "gg",
        value: "rg",
        targetSection: "Tools",
        isEditing: true,
        existingKey: "gg",
        originalSection: "Tools",
        sectionOccurrence: 0,
      });
      expect(result).toContain("alias gg='rg'");
      expect(result).not.toContain("git grep");
      expect(result).toContain("alias gs='git status'");
      expect(result).toContain("alias m='make'");
    });

    it("throws the fail-closed message when the definition is ambiguous", () => {
      const dup = ["# Section: Tools", "alias gg='one'", "alias gg='two'"].join("\n");
      expect(() =>
        computeUpdatedContent(dup, {
          config: aliasConfig,
          key: "gg",
          value: "three",
          targetSection: "Tools",
          isEditing: true,
          existingKey: "gg",
          originalSection: "Tools",
          sectionOccurrence: 0,
        }),
      ).toThrow(/Multiple definitions of "gg"/);
    });

    it("throws not-found when the definition vanished", () => {
      expect(() =>
        computeUpdatedContent(CONTENT, {
          config: aliasConfig,
          key: "ghost",
          value: "x",
          targetSection: "Tools",
          isEditing: true,
          existingKey: "ghost",
          originalSection: "Tools",
          sectionOccurrence: 0,
        }),
      ).toThrow(/"ghost" not found/);
    });
  });

  describe("computeUpdatedContent — move between sections", () => {
    it("removes from the original section and inserts into the target", () => {
      const result = computeUpdatedContent(CONTENT, {
        config: aliasConfig,
        key: "gg",
        value: "git grep",
        targetSection: "Misc",
        isEditing: true,
        existingKey: "gg",
        originalSection: "Tools",
        sectionOccurrence: 0,
      });
      // Gone from Tools, present in Misc after the existing entry
      const miscIndex = result.indexOf("# Section: Misc");
      expect(result.indexOf("alias gg=")).toBeGreaterThan(miscIndex);
      expect(result.indexOf("alias gs=")).toBeLessThan(miscIndex);
    });

    it("creates the target section when it does not exist", () => {
      const result = computeUpdatedContent(CONTENT, {
        config: aliasConfig,
        key: "gg",
        value: "git grep",
        targetSection: "Fresh",
        isEditing: true,
        existingKey: "gg",
        originalSection: "Tools",
        sectionOccurrence: 0,
      });
      expect(result).toContain("# --- Fresh --- #\nalias gg='git grep'");
    });
  });

  describe("computeDeletedContent", () => {
    it("removes exactly the targeted definition", () => {
      const result = computeDeletedContent(CONTENT, {
        config: aliasConfig,
        existingKey: "gg",
        sectionLabel: "Tools",
        sectionOccurrence: 0,
      });
      expect(result).not.toContain("alias gg=");
      expect(result).toContain("alias gs='git status'");
      expect(result).toContain("alias m='make'");
    });

    it("refuses ambiguous same-section duplicates without modifying content", () => {
      const dup = ["# Section: Tools", "alias gg='one'", "alias gg='two'"].join("\n");
      expect(() =>
        computeDeletedContent(dup, {
          config: aliasConfig,
          existingKey: "gg",
          sectionLabel: "Tools",
          sectionOccurrence: 0,
        }),
      ).toThrow(/Multiple definitions/);
    });
  });

  describe("scopedFailureMessage", () => {
    it("maps each refusal reason to its user-facing message", () => {
      expect(scopedFailureMessage("ambiguous", "Alias", "gg")).toMatch(/Multiple definitions/);
      expect(scopedFailureMessage("unsupported", "Alias", "gg")).toMatch(/cannot rewrite safely/);
      expect(scopedFailureMessage("not-found", "Alias", "gg")).toMatch(/not found/);
      expect(scopedFailureMessage(undefined, "Alias", "gg")).toMatch(/not found/);
    });
  });
});
