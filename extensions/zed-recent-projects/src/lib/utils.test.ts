import { describe, it, expect } from "vitest";
import { shellEscape } from "./utils";

describe("shellEscape", () => {
  it("should wrap simple strings in single quotes", () => {
    expect(shellEscape("hello")).toBe("'hello'");
    expect(shellEscape("world")).toBe("'world'");
  });

  it("should handle strings with spaces", () => {
    expect(shellEscape("hello world")).toBe("'hello world'");
    expect(shellEscape("path/to/my file.txt")).toBe("'path/to/my file.txt'");
  });

  it("should escape single quotes within strings", () => {
    expect(shellEscape("it's")).toBe("'it'\\''s'");
    expect(shellEscape("don't stop")).toBe("'don'\\''t stop'");
  });

  it("should handle multiple single quotes", () => {
    expect(shellEscape("it's a 'test'")).toBe("'it'\\''s a '\\''test'\\'''");
  });

  it("should handle empty strings", () => {
    expect(shellEscape("")).toBe("''");
  });

  it("should not escape double quotes (they're safe in single quotes)", () => {
    expect(shellEscape('"quoted"')).toBe("'\"quoted\"'");
  });

  it("should handle paths with special characters", () => {
    expect(shellEscape("/Users/test/My Documents")).toBe("'/Users/test/My Documents'");
    expect(shellEscape("/path/with$dollar")).toBe("'/path/with$dollar'");
    expect(shellEscape("/path/with`backtick`")).toBe("'/path/with`backtick`'");
  });

  it("should handle unicode characters", () => {
    expect(shellEscape("/Users/test/日本語")).toBe("'/Users/test/日本語'");
    expect(shellEscape("emoji-folder-🚀")).toBe("'emoji-folder-🚀'");
  });
});
