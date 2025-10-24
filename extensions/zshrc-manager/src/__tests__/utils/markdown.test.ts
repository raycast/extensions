/**
 * Tests for markdown generation utility module
 */

import { describe, it, expect } from "vitest";
import {
  parseSectionContent,
  applyContentFilter,
  generateRawMarkdown,
  generateCompactMarkdown,
  generateFormattedMarkdown,
  generateSectionMarkdown,
  ParsedSectionContent,
} from "../../utils/markdown";
import { LogicalSection } from "../../lib/parse-zshrc";

// Mock section factory
const createMockSection = (
  label: string = "Test Section",
  content: string = "",
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

describe("markdown.ts", () => {
  describe("parseSectionContent", () => {
    it("should parse aliases from content", () => {
      const section = createMockSection("Test", "alias ll='ls -la'\nalias gs='git status'");
      const content = parseSectionContent(section);

      expect(content.aliases).toHaveLength(2);
      expect(content.aliases[0]?.name).toBe("ll");
      expect(content.aliases[1]?.name).toBe("gs");
    });

    it("should parse exports from content", () => {
      const section = createMockSection("Test", "export PATH=/usr/bin\nexport LANG=en_US.UTF-8");
      const content = parseSectionContent(section);

      expect(content.exports).toHaveLength(2);
      expect(content.exports[0]?.variable).toBe("PATH");
      expect(content.exports[1]?.variable).toBe("LANG");
    });

    it("should extract other lines", () => {
      const section = createMockSection("Test", "# Comment\nalias a='a'\n# Another comment\nsome_function");
      const content = parseSectionContent(section);

      expect(content.otherLines).toContain("some_function");
      expect(content.otherLines).not.toContain("# Comment");
    });

    it("should filter out comments and empty lines", () => {
      const section = createMockSection("Test", "# Comment\nalias a='a'\n\n  \nother_line");
      const content = parseSectionContent(section);

      expect(content.otherLines.every((line) => !line.startsWith("#"))).toBe(true);
      expect(content.otherLines.every((line) => line.trim().length > 0)).toBe(true);
    });

    it("should handle empty content", () => {
      const section = createMockSection("Test", "");
      const content = parseSectionContent(section);

      expect(content.aliases).toHaveLength(0);
      expect(content.exports).toHaveLength(0);
      expect(content.otherLines).toHaveLength(0);
    });

    it("should handle content with only comments", () => {
      const section = createMockSection("Test", "# Comment 1\n# Comment 2\n# Comment 3");
      const content = parseSectionContent(section);

      expect(content.aliases).toHaveLength(0);
      expect(content.exports).toHaveLength(0);
      expect(content.otherLines).toHaveLength(0);
    });
  });

  describe("applyContentFilter", () => {
    let content: ParsedSectionContent;

    beforeEach(() => {
      const section = createMockSection("Test", "alias a='a'\nexport A=1\nother_line");
      content = parseSectionContent(section);
    });

    it("should include all content when filter is 'all'", () => {
      const filtered = applyContentFilter(content, "all");

      expect(filtered.aliases.length).toBeGreaterThan(0);
      expect(filtered.exports.length).toBeGreaterThan(0);
      expect(filtered.otherLines.length).toBeGreaterThan(0);
    });

    it("should include only aliases when filter is 'aliases'", () => {
      const filtered = applyContentFilter(content, "aliases");

      expect(filtered.aliases.length).toBeGreaterThan(0);
      expect(filtered.exports).toHaveLength(0);
      expect(filtered.otherLines).toHaveLength(0);
    });

    it("should include only exports when filter is 'exports'", () => {
      const filtered = applyContentFilter(content, "exports");

      expect(filtered.aliases).toHaveLength(0);
      expect(filtered.exports.length).toBeGreaterThan(0);
      expect(filtered.otherLines).toHaveLength(0);
    });

    it("should default to 'all' when no filter specified", () => {
      const filtered = applyContentFilter(content);

      expect(filtered.aliases.length).toBeGreaterThan(0);
      expect(filtered.exports.length).toBeGreaterThan(0);
      expect(filtered.otherLines.length).toBeGreaterThan(0);
    });
  });

  describe("generateRawMarkdown", () => {
    it("should generate raw markdown with section content", () => {
      const section = createMockSection("Test", "alias a='a'\nexport A=1", 5, 15);
      const md = generateRawMarkdown(section);

      expect(md).toContain("# Test");
      expect(md).toContain("5-15");
      expect(md).toContain("alias a='a'");
      expect(md).toContain("export A=1");
      expect(md).toContain("```zsh");
    });

    it("should include line range information", () => {
      const section = createMockSection("Test", "content", 100, 200);
      const md = generateRawMarkdown(section);

      expect(md).toContain("100-200");
    });
  });

  describe("generateCompactMarkdown", () => {
    it("should include section label and line range", () => {
      const section = createMockSection("MySection", "alias a='a'", 1, 10);
      const content = parseSectionContent(section);
      const md = generateCompactMarkdown(section, content);

      expect(md).toContain("# MySection");
      expect(md).toContain("1-10");
    });

    it("should include aliases when present", () => {
      const section = createMockSection("Test", "alias ll='ls -la'");
      const content = parseSectionContent(section);
      const md = generateCompactMarkdown(section, content);

      expect(md).toContain("🖥️ Aliases");
      expect(md).toContain("ll");
    });

    it("should include exports when present", () => {
      const section = createMockSection("Test", "export PATH=/usr/bin");
      const content = parseSectionContent(section);
      const md = generateCompactMarkdown(section, content);

      expect(md).toContain("📦 Exports");
      expect(md).toContain("PATH");
    });

    it("should not include empty sections", () => {
      const section = createMockSection("Test", "# only comments");
      const content = parseSectionContent(section);
      const md = generateCompactMarkdown(section, content);

      expect(md).not.toContain("🖥️ Aliases");
      expect(md).not.toContain("📦 Exports");
    });
  });

  describe("generateFormattedMarkdown", () => {
    it("should include section header", () => {
      const section = createMockSection("MySection", "alias a='a'");
      const content = parseSectionContent(section);
      const md = generateFormattedMarkdown(section, content);

      expect(md).toContain("# MySection");
    });

    it("should include raw content section", () => {
      const section = createMockSection("Test", "alias a='a'");
      const content = parseSectionContent(section);
      const md = generateFormattedMarkdown(section, content);

      expect(md).toContain("## 📋 Raw Content");
      expect(md).toContain("```zsh");
      expect(md).toContain("alias a='a'");
    });

    it("should format aliases as list items", () => {
      const section = createMockSection("Test", "alias ll='ls -la'\nalias gs='git status'");
      const content = parseSectionContent(section);
      const md = generateFormattedMarkdown(section, content);

      expect(md).toContain("## 🖥️ Aliases");
      expect(md).toContain("- **`ll`**");
      expect(md).toContain("- **`gs`**");
    });

    it("should format exports as list items", () => {
      const section = createMockSection("Test", "export A=1\nexport B=2");
      const content = parseSectionContent(section);
      const md = generateFormattedMarkdown(section, content);

      expect(md).toContain("## 📦 Exports");
      expect(md).toContain("- **`A`**");
      expect(md).toContain("- **`B`**");
    });

    it("should include horizontal separators between sections", () => {
      const section = createMockSection("Test", "alias a='a'\nexport A=1");
      const content = parseSectionContent(section);
      const md = generateFormattedMarkdown(section, content);

      const separatorCount = (md.match(/---/g) || []).length;
      expect(separatorCount).toBeGreaterThan(2);
    });
  });

  describe("generateSectionMarkdown", () => {
    it("should use raw markdown generator for 'raw' mode", () => {
      const section = createMockSection("Test", "content");
      const md = generateSectionMarkdown(section, "raw");

      expect(md).toContain("## 📋 Raw Content");
      expect(md).toContain("```zsh");
    });

    it("should use compact markdown generator for 'compact' mode", () => {
      const section = createMockSection("Test", "alias a='a'\nexport A=1");
      const md = generateSectionMarkdown(section, "compact");

      expect(md).toContain("# Test");
      expect(md).toContain("|");
    });

    it("should use formatted markdown generator for 'formatted' mode", () => {
      const section = createMockSection("Test", "alias a='a'");
      const md = generateSectionMarkdown(section, "formatted");

      expect(md).toContain("## 🖥️ Aliases");
      expect(md).toContain("- **");
    });

    it("should default to 'formatted' mode", () => {
      const section = createMockSection("Test", "alias a='a'");
      const mdDefault = generateSectionMarkdown(section);
      const mdFormatted = generateSectionMarkdown(section, "formatted");

      expect(mdDefault).toBe(mdFormatted);
    });

    it("should use provided pre-parsed content", () => {
      const section = createMockSection("Test", "alias a='a'\nexport A=1");
      const content = parseSectionContent(section);
      const filtered = applyContentFilter(content, "aliases");

      const md = generateSectionMarkdown(section, "formatted", filtered);

      expect(md).toContain("🖥️ Aliases");
      expect(md).not.toContain("📦 Exports");
    });

    it("should parse content if not provided", () => {
      const section = createMockSection("Test", "alias a='a'");
      const md = generateSectionMarkdown(section, "formatted");

      expect(md).toContain("🖥️ Aliases");
    });
  });
});
