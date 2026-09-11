import { describe, it, expect } from "vitest";
import { escapeRegExp, stripSurroundingQuotes } from "../utils/shell-escape";

describe("shell-escape.ts", () => {
  describe("escapeRegExp", () => {
    it("escapes regex metacharacters so names match literally", () => {
      expect(new RegExp(`^${escapeRegExp("..")}$`).test("..")).toBe(true);
      expect(new RegExp(`^${escapeRegExp("..")}$`).test("ll")).toBe(false);
      expect(escapeRegExp("a.b*c")).toBe("a\\.b\\*c");
    });
  });

  describe("stripSurroundingQuotes", () => {
    it("strips one pair of matching quotes", () => {
      expect(stripSurroundingQuotes('"vim"')).toBe("vim");
      expect(stripSurroundingQuotes("'vim'")).toBe("vim");
    });

    it("leaves unquoted and mismatched values alone", () => {
      expect(stripSurroundingQuotes("vim")).toBe("vim");
      expect(stripSurroundingQuotes("\"a'")).toBe("\"a'");
      expect(stripSurroundingQuotes('"')).toBe('"');
      expect(stripSurroundingQuotes("")).toBe("");
    });

    it("strips only the outer pair", () => {
      expect(stripSurroundingQuotes('""quoted""')).toBe('"quoted"');
    });
  });
});
