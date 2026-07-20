/**
 * Tests for formatters.ts - Text formatting utilities
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { homedir } from "node:os";
import {
  truncateValueMiddle,
  formatCount,
  formatLineRange,
  sanitizeForMarkdown,
  expandEnvVars,
  formatPath,
} from "../utils/formatters";

describe("formatters.ts", () => {
  describe("truncateValueMiddle", () => {
    it("should return original value if under limit", () => {
      expect(truncateValueMiddle("short", 40)).toBe("short");
      // String with exactly 40 characters
      const exactlyForty = "a".repeat(40);
      expect(truncateValueMiddle(exactlyForty, 40)).toBe(exactlyForty);
    });

    it("should truncate long values in the middle", () => {
      const longValue = "this-is-a-very-long-path-that-exceeds-the-limit";
      const result = truncateValueMiddle(longValue, 20);

      expect(result.length).toBeLessThanOrEqual(21); // 20 + ellipsis
      expect(result).toContain("\u2026"); // Unicode ellipsis character
    });

    it("should use default limit of 40", () => {
      const longValue = "a".repeat(50);
      const result = truncateValueMiddle(longValue);

      expect(result.length).toBeLessThanOrEqual(41);
    });

    it("should handle exact limit length", () => {
      const exactValue = "a".repeat(40);
      const result = truncateValueMiddle(exactValue, 40);

      expect(result).toBe(exactValue);
    });

    it("should trim whitespace before truncating", () => {
      const valueWithSpaces = "  short  ";
      const result = truncateValueMiddle(valueWithSpaces, 40);

      expect(result).toBe("short");
    });

    it("should handle empty string", () => {
      expect(truncateValueMiddle("", 40)).toBe("");
    });

    it("should handle whitespace-only string", () => {
      expect(truncateValueMiddle("   ", 40)).toBe("");
    });

    it("should preserve start and end of value", () => {
      const value = "start-middle-end";
      const result = truncateValueMiddle(value, 10);

      expect(result.startsWith("star")).toBe(true);
      expect(result.endsWith("end")).toBe(true);
    });

    it("should handle very small limits", () => {
      const value = "hello world";
      const result = truncateValueMiddle(value, 5);

      expect(result.length).toBeLessThanOrEqual(6);
    });

    it("should handle limit of 0", () => {
      const value = "test";
      const result = truncateValueMiddle(value, 0);

      // With limit 0, head=0 and tail=0, so we get just the Unicode ellipsis
      expect(result).toBe("\u2026");
    });

    it("should handle limit of 1", () => {
      const value = "test";
      const result = truncateValueMiddle(value, 1);

      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe("formatCount", () => {
    it("should return singular form for count of 1", () => {
      expect(formatCount(1, "alias")).toBe("1 alias");
      expect(formatCount(1, "export")).toBe("1 export");
      expect(formatCount(1, "function")).toBe("1 function");
    });

    it("should return plural form for count of 0", () => {
      expect(formatCount(0, "alias")).toBe("0 aliases");
      expect(formatCount(0, "export")).toBe("0 exports");
    });

    it("should return plural form for count > 1", () => {
      expect(formatCount(2, "alias")).toBe("2 aliases");
      expect(formatCount(5, "export")).toBe("5 exports");
      expect(formatCount(100, "function")).toBe("100 functions");
    });

    it("should handle words ending in s", () => {
      expect(formatCount(2, "class")).toBe("2 classes");
      expect(formatCount(2, "pass")).toBe("2 passes");
    });

    it("should handle words ending in x", () => {
      expect(formatCount(2, "box")).toBe("2 boxes");
      expect(formatCount(2, "fix")).toBe("2 fixes");
    });

    it("should handle words ending in z", () => {
      // Words that need z-doubling
      expect(formatCount(2, "quiz")).toBe("2 quizzes");
      expect(formatCount(2, "fez")).toBe("2 fezzes");
      // Words that just add 'es' (no z-doubling)
      expect(formatCount(2, "waltz")).toBe("2 waltzes");
      expect(formatCount(2, "topaz")).toBe("2 topazes");
    });

    it("should handle words ending in ch", () => {
      expect(formatCount(2, "match")).toBe("2 matches");
      expect(formatCount(2, "batch")).toBe("2 batches");
    });

    it("should handle words ending in sh", () => {
      expect(formatCount(2, "bash")).toBe("2 bashes");
      expect(formatCount(2, "hash")).toBe("2 hashes");
    });

    it("should handle negative counts", () => {
      expect(formatCount(-1, "item")).toBe("-1 items");
    });
  });

  describe("formatLineRange", () => {
    it("should format a line range correctly", () => {
      expect(formatLineRange(1, 10)).toBe("Lines 1-10");
      expect(formatLineRange(5, 20)).toBe("Lines 5-20");
      expect(formatLineRange(100, 200)).toBe("Lines 100-200");
    });

    it("should handle same start and end", () => {
      expect(formatLineRange(5, 5)).toBe("Lines 5-5");
    });

    it("should handle line 0", () => {
      expect(formatLineRange(0, 10)).toBe("Lines 0-10");
    });
  });

  describe("sanitizeForMarkdown", () => {
    it("should escape backslashes", () => {
      expect(sanitizeForMarkdown("path\\to\\file")).toBe("path\\\\to\\\\file");
    });

    it("should escape backticks", () => {
      expect(sanitizeForMarkdown("use `code` here")).toBe("use \\`code\\` here");
    });

    it("should escape dollar signs", () => {
      expect(sanitizeForMarkdown("$HOME/path")).toBe("\\$HOME/path");
      expect(sanitizeForMarkdown("${VAR}")).toBe("\\${VAR}");
    });

    it("should handle multiple special characters", () => {
      const input = "path\\to\\$HOME/`file`";
      const expected = "path\\\\to\\\\\\$HOME/\\`file\\`";
      expect(sanitizeForMarkdown(input)).toBe(expected);
    });

    it("should handle empty string", () => {
      expect(sanitizeForMarkdown("")).toBe("");
    });

    it("should not modify plain text", () => {
      expect(sanitizeForMarkdown("plain text")).toBe("plain text");
    });

    it("should handle consecutive special characters", () => {
      expect(sanitizeForMarkdown("\\\\")).toBe("\\\\\\\\");
      expect(sanitizeForMarkdown("``")).toBe("\\`\\`");
      expect(sanitizeForMarkdown("$$")).toBe("\\$\\$");
    });
  });

  describe("expandEnvVars", () => {
    const home = homedir();
    const originalEnv = { ...process.env };

    beforeEach(() => {
      // Set up test environment variables
      process.env["USER"] = "testuser";
      process.env["USERNAME"] = "testuser";
    });

    afterEach(() => {
      // Restore original environment by clearing test keys and restoring originals
      // First clear any keys added during tests
      delete process.env["ZDOTDIR"];
      // Then restore original values
      Object.keys(originalEnv).forEach((key) => {
        process.env[key] = originalEnv[key];
      });
    });

    it("should expand ~ at start of path", () => {
      expect(expandEnvVars("~/path/to/file")).toBe(`${home}/path/to/file`);
      expect(expandEnvVars("~")).toBe(home);
    });

    it("should not expand ~ in middle of path", () => {
      expect(expandEnvVars("/path/~/file")).toBe("/path/~/file");
    });

    it("should expand $HOME", () => {
      expect(expandEnvVars("$HOME/path")).toBe(`${home}/path`);
      expect(expandEnvVars("prefix$HOME/suffix")).toBe(`prefix${home}/suffix`);
    });

    it("should expand ${HOME}", () => {
      expect(expandEnvVars("${HOME}/path")).toBe(`${home}/path`);
    });

    it("should expand $USER", () => {
      const result = expandEnvVars("$USER");
      expect(result).toBe("testuser");
    });

    it("should expand ${USER}", () => {
      const result = expandEnvVars("${USER}");
      expect(result).toBe("testuser");
    });

    it("should expand $ZSH", () => {
      expect(expandEnvVars("$ZSH/plugins")).toBe(`${home}/.oh-my-zsh/plugins`);
    });

    it("should expand ${ZSH}", () => {
      expect(expandEnvVars("${ZSH}/themes")).toBe(`${home}/.oh-my-zsh/themes`);
    });

    it("should expand $ZDOTDIR", () => {
      const result = expandEnvVars("$ZDOTDIR/.zshrc");
      // ZDOTDIR defaults to home if not set
      expect(result).toContain("/.zshrc");
    });

    it("should expand ${ZDOTDIR}", () => {
      const result = expandEnvVars("${ZDOTDIR}/.zshrc");
      expect(result).toContain("/.zshrc");
    });

    it("should handle multiple variables in one string", () => {
      const result = expandEnvVars("$HOME/$USER/files");
      expect(result).toBe(`${home}/testuser/files`);
    });

    it("should handle empty string", () => {
      expect(expandEnvVars("")).toBe("");
    });

    it("should not modify strings without variables", () => {
      expect(expandEnvVars("/usr/local/bin")).toBe("/usr/local/bin");
    });

    it("should handle partial variable names", () => {
      // $HOMEX should not be expanded (only $HOME word boundary)
      expect(expandEnvVars("$HOMEX")).toBe("$HOMEX");
    });

    it("should expand ZDOTDIR from environment when set", () => {
      process.env["ZDOTDIR"] = "/custom/zdotdir";
      const result = expandEnvVars("$ZDOTDIR/config");
      expect(result).toBe("/custom/zdotdir/config");
    });
  });

  describe("formatPath", () => {
    const home = homedir();

    it("should contract home directory to ~ by default", () => {
      expect(formatPath(`${home}/documents`)).toBe("~/documents");
      expect(formatPath(`${home}/.zshrc`)).toBe("~/.zshrc");
    });

    it("should not contract when contractHome is false", () => {
      expect(formatPath(`${home}/documents`, { contractHome: false })).toBe(`${home}/documents`);
    });

    it("should expand variables when expand is true", () => {
      const result = formatPath("$HOME/documents", { expand: true });
      // After expansion and contraction
      expect(result).toBe("~/documents");
    });

    it("should expand and not contract", () => {
      const result = formatPath("$HOME/documents", {
        expand: true,
        contractHome: false,
      });
      expect(result).toBe(`${home}/documents`);
    });

    it("should handle paths not starting with home", () => {
      expect(formatPath("/usr/local/bin")).toBe("/usr/local/bin");
    });

    it("should handle ~ expansion and contraction", () => {
      const result = formatPath("~/documents", { expand: true });
      expect(result).toBe("~/documents");
    });

    it("should handle empty path", () => {
      expect(formatPath("")).toBe("");
    });

    it("should handle paths that are exactly home", () => {
      expect(formatPath(home)).toBe("~");
    });

    it("should not contract paths that just contain home string", () => {
      // If path doesn't START with home, shouldn't contract
      const pathWithHomeInMiddle = `/other${home}/path`;
      expect(formatPath(pathWithHomeInMiddle)).toBe(pathWithHomeInMiddle);
    });
  });
});
