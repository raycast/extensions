/**
 * Tests for formatters utility module
 */

import { truncateValueMiddle, formatCount, formatLineRange, sanitizeForMarkdown } from "../../utils/formatters";

describe("formatters.ts", () => {
  describe("truncateValueMiddle", () => {
    it("should return value unchanged if within limit", () => {
      const value = "short";
      const result = truncateValueMiddle(value, 40);
      expect(result).toBe("short");
    });

    it("should truncate from middle if exceeds limit", () => {
      const value = "very-long-path-that-exceeds-the-limit";
      const result = truncateValueMiddle(value, 20);
      expect(result.length).toBeLessThanOrEqual(22); // 20 + ellipsis overhead
      expect(result).toContain("…");
      expect(result).toMatch(/^very.*limit$/);
    });

    it("should use default limit of 40 when not provided", () => {
      const value = "a".repeat(50);
      const result = truncateValueMiddle(value);
      expect(result.length).toBeLessThanOrEqual(42); // 40 + ellipsis
    });

    it("should handle empty strings", () => {
      const result = truncateValueMiddle("", 40);
      expect(result).toBe("");
    });

    it("should handle whitespace-only strings", () => {
      const result = truncateValueMiddle("   ", 40);
      expect(result).toBe("");
    });

    it("should trim whitespace before truncating", () => {
      const value = "   short-value   ";
      const result = truncateValueMiddle(value, 40);
      expect(result).toBe("short-value");
    });

    it("should handle single character", () => {
      const result = truncateValueMiddle("a", 40);
      expect(result).toBe("a");
    });

    it("should handle exactly limit length", () => {
      const value = "a".repeat(40);
      const result = truncateValueMiddle(value, 40);
      expect(result).toBe(value);
    });

    it("should handle limit of 1", () => {
      const value = "abc";
      const result = truncateValueMiddle(value, 1);
      expect(result).toContain("…");
    });
  });

  describe("formatCount", () => {
    it("should return singular form for count of 1", () => {
      const result = formatCount(1, "alias");
      expect(result).toBe("1 alias");
    });

    it("should return plural form for count > 1", () => {
      const result = formatCount(5, "alias");
      expect(result).toBe("5 aliases");
    });

    it("should return plural form for count of 0", () => {
      const result = formatCount(0, "alias");
      expect(result).toBe("0 aliases");
    });

    it("should handle large numbers", () => {
      const result = formatCount(1000, "export");
      expect(result).toBe("1000 exports");
    });

    it("should work with different singular words", () => {
      expect(formatCount(1, "function")).toBe("1 function");
      expect(formatCount(2, "function")).toBe("2 functions");
      expect(formatCount(1, "plugin")).toBe("1 plugin");
      expect(formatCount(3, "plugin")).toBe("3 plugins");
    });

    it("should handle negative counts", () => {
      const result = formatCount(-1, "alias");
      expect(result).toBe("-1 aliases");
    });

    it("should handle words ending in 's' correctly", () => {
      const result = formatCount(2, "class");
      expect(result).toBe("2 classes");
    });

    it("should handle words ending in 'x' correctly", () => {
      const result = formatCount(2, "box");
      expect(result).toBe("2 boxes");
    });

    it("should handle words ending in 'ch' correctly", () => {
      const result = formatCount(2, "branch");
      expect(result).toBe("2 branches");
    });
  });

  describe("formatLineRange", () => {
    it("should format line range correctly", () => {
      const result = formatLineRange(1, 10);
      expect(result).toBe("Lines 1-10");
    });

    it("should handle single line", () => {
      const result = formatLineRange(5, 5);
      expect(result).toBe("Lines 5-5");
    });

    it("should handle large line numbers", () => {
      const result = formatLineRange(100, 500);
      expect(result).toBe("Lines 100-500");
    });

    it("should handle reverse order (end before start)", () => {
      const result = formatLineRange(10, 1);
      expect(result).toBe("Lines 10-1");
    });

    it("should handle zero line numbers", () => {
      const result = formatLineRange(0, 0);
      expect(result).toBe("Lines 0-0");
    });
  });

  describe("sanitizeForMarkdown", () => {
    it("should escape backslashes", () => {
      const result = sanitizeForMarkdown("path\\to\\file");
      expect(result).toBe("path\\\\to\\\\file");
    });

    it("should escape backticks", () => {
      const result = sanitizeForMarkdown("code with `backticks`");
      expect(result).toBe("code with \\`backticks\\`");
    });

    it("should escape dollar signs", () => {
      const result = sanitizeForMarkdown("variable $PATH");
      expect(result).toBe("variable \\$PATH");
    });

    it("should handle multiple special characters", () => {
      const result = sanitizeForMarkdown("path\\with`backticks`and$dollar");
      expect(result).toBe("path\\\\with\\`backticks\\`and\\$dollar");
    });

    it("should handle empty strings", () => {
      const result = sanitizeForMarkdown("");
      expect(result).toBe("");
    });

    it("should not modify normal text", () => {
      const result = sanitizeForMarkdown("normal text with no special chars");
      expect(result).toBe("normal text with no special chars");
    });

    it("should escape in correct order", () => {
      const result = sanitizeForMarkdown("`$test\\path`");
      expect(result).toBe("\\`\\$test\\\\path\\`");
    });
  });
});
