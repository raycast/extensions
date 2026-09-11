/**
 * Tests for diff.ts - Diff utility for showing changes
 */

import { describe, it, expect } from "vitest";
import { computeDiff, generatePreview, createDiffPreview, type DiffResult } from "../utils/diff";

describe("diff.ts", () => {
  describe("computeDiff", () => {
    it("should detect no changes for identical content", () => {
      const content = "line1\nline2\nline3";
      const result = computeDiff(content, content);

      expect(result.hasChanges).toBe(false);
      expect(result.additions).toBe(0);
      expect(result.deletions).toBe(0);
      expect(result.markdown).toBe("No changes detected.");
    });

    it("should detect added lines", () => {
      const original = "line1\nline2";
      const modified = "line1\nline2\nline3";
      const result = computeDiff(original, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.additions).toBe(1);
      expect(result.deletions).toBe(0);
      expect(result.lines.some((l) => l.type === "add" && l.content === "line3")).toBe(true);
    });

    it("should detect removed lines", () => {
      const original = "line1\nline2\nline3";
      const modified = "line1\nline2";
      const result = computeDiff(original, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.additions).toBe(0);
      expect(result.deletions).toBe(1);
      expect(result.lines.some((l) => l.type === "remove" && l.content === "line3")).toBe(true);
    });

    it("should detect changed lines", () => {
      const original = "line1\nold line\nline3";
      const modified = "line1\nnew line\nline3";
      const result = computeDiff(original, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.additions).toBe(1);
      expect(result.deletions).toBe(1);
    });

    it("should handle empty original", () => {
      const original = "";
      const modified = "line1\nline2";
      const result = computeDiff(original, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.additions).toBe(2);
      expect(result.deletions).toBe(1); // Empty string becomes one "empty" line
    });

    it("should handle empty modified", () => {
      const original = "line1\nline2";
      const modified = "";
      const result = computeDiff(original, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.deletions).toBeGreaterThan(0);
    });

    it("should handle both empty", () => {
      const result = computeDiff("", "");

      expect(result.hasChanges).toBe(false);
    });

    it("should include unchanged lines in the result", () => {
      const original = "line1\nline2\nline3";
      const modified = "line1\nchanged\nline3";
      const result = computeDiff(original, modified);

      const unchangedLines = result.lines.filter((l) => l.type === "unchanged");
      expect(unchangedLines.length).toBeGreaterThan(0);
    });

    it("should track line numbers for added lines", () => {
      const original = "line1";
      const modified = "line1\nnew line";
      const result = computeDiff(original, modified);

      const addedLine = result.lines.find((l) => l.type === "add");
      expect(addedLine).toBeDefined();
      expect(addedLine?.lineNumber).toBe(2);
    });

    it("should generate markdown with summary", () => {
      const original = "line1";
      const modified = "line1\nline2";
      const result = computeDiff(original, modified);

      expect(result.markdown).toContain("## Changes Summary");
      expect(result.markdown).toContain("addition");
      expect(result.markdown).toContain("## Diff");
      expect(result.markdown).toContain("```diff");
    });

    it("should pluralize additions/deletions correctly", () => {
      // Single addition
      let result = computeDiff("a", "a\nb");
      expect(result.markdown).toContain("**1** addition");

      // Multiple additions
      result = computeDiff("a", "a\nb\nc\nd");
      expect(result.markdown).toContain("additions");
    });

    it("should respect contextLines parameter", () => {
      const original = "1\n2\n3\n4\n5\n6\n7\n8\n9\n10";
      const modified = "1\n2\n3\n4\nCHANGED\n6\n7\n8\n9\n10";

      const result1 = computeDiff(original, modified, 1);
      const result3 = computeDiff(original, modified, 3);

      // With more context lines, the markdown should include more surrounding lines
      expect(result3.markdown.length).toBeGreaterThanOrEqual(result1.markdown.length);
    });

    it("should handle multiline additions", () => {
      const original = "start\nend";
      const modified = "start\nnew1\nnew2\nnew3\nend";
      const result = computeDiff(original, modified);

      expect(result.additions).toBe(3);
    });

    it("should handle multiline deletions", () => {
      const original = "start\nold1\nold2\nold3\nend";
      const modified = "start\nend";
      const result = computeDiff(original, modified);

      expect(result.deletions).toBe(3);
    });

    it("should handle complete content replacement", () => {
      const original = "old1\nold2\nold3";
      const modified = "new1\nnew2\nnew3";
      const result = computeDiff(original, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.additions).toBe(3);
      expect(result.deletions).toBe(3);
    });

    it("should handle lines with special characters", () => {
      const original = "alias test='echo \"hello\"'";
      const modified = "alias test='echo \"world\"'";
      const result = computeDiff(original, modified);

      expect(result.hasChanges).toBe(true);
    });

    it("should handle whitespace-only changes", () => {
      const original = "line1";
      const modified = "line1 ";
      const result = computeDiff(original, modified);

      expect(result.hasChanges).toBe(true);
    });
  });

  describe("generatePreview", () => {
    it("should return no changes message for identical content", () => {
      const content = "line1\nline2";
      const result = generatePreview(content, content);

      expect(result).toBe("No changes to preview.");
    });

    it("should generate preview with zsh code block", () => {
      const original = "old";
      const modified = "new";
      const result = generatePreview(original, modified);

      expect(result).toContain("## Preview");
      expect(result).toContain("```zsh");
      expect(result).toContain("new");
      expect(result).toContain("```");
    });

    it("should truncate preview to maxLines", () => {
      const original = "";
      const modified = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join("\n");
      const result = generatePreview(original, modified, 10);

      expect(result).toContain("... (40 more lines)");
    });

    it("should use default maxLines of 20", () => {
      const original = "";
      const modified = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join("\n");
      const result = generatePreview(original, modified);

      expect(result).toContain("... (30 more lines)");
    });

    it("should not show more lines indicator when under limit", () => {
      const original = "";
      const modified = "line1\nline2\nline3";
      const result = generatePreview(original, modified, 10);

      expect(result).not.toContain("more lines");
    });

    it("should show exact line count remaining", () => {
      const original = "";
      const modified = Array.from({ length: 25 }, (_, i) => `line ${i}`).join("\n");
      const result = generatePreview(original, modified, 20);

      expect(result).toContain("(5 more lines)");
    });
  });

  describe("createDiffPreview", () => {
    it("should combine diff and preview", () => {
      const original = "old content";
      const modified = "new content";
      const result = createDiffPreview(original, modified);

      expect(result).toContain("## Changes Summary");
      expect(result).toContain("## Diff");
      expect(result).toContain("## Preview");
    });

    it("should handle no changes", () => {
      const content = "same content";
      const result = createDiffPreview(content, content);

      expect(result).toContain("No changes detected.");
      expect(result).toContain("No changes to preview.");
    });

    it("should include both diff markers and preview code", () => {
      const original = "alias old='cmd'";
      const modified = "alias new='cmd'";
      const result = createDiffPreview(original, modified);

      // Should have diff section with + and -
      expect(result).toContain("```diff");
      // Should have preview section
      expect(result).toContain("```zsh");
    });

    it("should separate diff and preview with newlines", () => {
      const original = "a";
      const modified = "b";
      const result = createDiffPreview(original, modified);

      // Should have double newline between sections
      expect(result).toContain("\n\n");
    });
  });

  describe("DiffResult interface", () => {
    it("should have correct structure", () => {
      const result: DiffResult = computeDiff("a", "b");

      expect(typeof result.hasChanges).toBe("boolean");
      expect(typeof result.additions).toBe("number");
      expect(typeof result.deletions).toBe("number");
      expect(Array.isArray(result.lines)).toBe(true);
      expect(typeof result.markdown).toBe("string");
    });

    it("should have valid line types", () => {
      const result = computeDiff("old\nsame", "new\nsame");

      result.lines.forEach((line) => {
        expect(["add", "remove", "unchanged"]).toContain(line.type);
        expect(typeof line.content).toBe("string");
      });
    });
  });

  describe("edge cases", () => {
    it("should handle single character differences", () => {
      const result = computeDiff("a", "b");
      expect(result.hasChanges).toBe(true);
    });

    it("should handle very long lines", () => {
      const longLine = "x".repeat(10000);
      const result = computeDiff(longLine, longLine + "y");
      expect(result.hasChanges).toBe(true);
    });

    it("should handle unicode characters", () => {
      const result = computeDiff("hello", "hello ");
      expect(result.hasChanges).toBe(true);
    });

    it("should handle newline-only content", () => {
      const result = computeDiff("\n\n\n", "\n\n");
      expect(result.hasChanges).toBe(true);
    });

    it("should handle tabs", () => {
      const result = computeDiff("\tindented", "  indented");
      expect(result.hasChanges).toBe(true);
    });

    it("should handle mixed line endings", () => {
      // Note: This tests \n line endings since we split on \n
      const result = computeDiff("line1\nline2", "line1\nline2\nline3");
      expect(result.additions).toBe(1);
    });
  });
});
