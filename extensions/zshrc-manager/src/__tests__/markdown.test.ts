/**
 * Tests for markdown.ts - Markdown generation utilities for zshrc sections
 */

import { describe, it, expect } from "vitest";
import {
  parseSectionContent,
  applyContentFilter,
  generateRawMarkdown,
  generateCompactMarkdown,
  generateFormattedMarkdown,
  generateSectionMarkdown,
  type ParsedSectionContent,
} from "../utils/markdown";
import type { LogicalSection } from "../lib/parse-zshrc";

// Helper to create a minimal LogicalSection for testing
function createSection(overrides: Partial<LogicalSection> = {}): LogicalSection {
  return {
    label: "Test Section",
    content: "",
    startLine: 1,
    endLine: 10,
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
    ...overrides,
  };
}

describe("markdown.ts", () => {
  describe("parseSectionContent", () => {
    it("should parse aliases from section content", () => {
      const section = createSection({
        content: `alias ll='ls -la'
alias gs='git status'`,
      });

      const result = parseSectionContent(section);

      expect(result.aliases).toHaveLength(2);
      expect(result.aliases[0]).toEqual({ name: "ll", command: "ls -la" });
      expect(result.aliases[1]).toEqual({ name: "gs", command: "git status" });
    });

    it("should parse exports from section content", () => {
      const section = createSection({
        content: `export PATH=/usr/local/bin:$PATH
export EDITOR=vim`,
      });

      const result = parseSectionContent(section);

      expect(result.exports).toHaveLength(2);
      expect(result.exports[0]).toEqual({ variable: "PATH", value: "/usr/local/bin:$PATH" });
      expect(result.exports[1]).toEqual({ variable: "EDITOR", value: "vim" });
    });

    it("should extract other configuration lines", () => {
      const section = createSection({
        content: `# Comment line
alias ll='ls -la'
setopt AUTO_CD
export PATH=/usr/local/bin:$PATH
eval "$(starship init zsh)"`,
      });

      const result = parseSectionContent(section);

      expect(result.otherLines).toContain("setopt AUTO_CD");
      expect(result.otherLines).toContain('eval "$(starship init zsh)"');
      expect(result.otherLines).not.toContain("# Comment line");
    });

    it("should handle empty section content", () => {
      const section = createSection({ content: "" });

      const result = parseSectionContent(section);

      expect(result.aliases).toHaveLength(0);
      expect(result.exports).toHaveLength(0);
      expect(result.otherLines).toHaveLength(0);
    });

    it("should handle section with only comments", () => {
      const section = createSection({
        content: `# Comment 1
# Comment 2
# Comment 3`,
      });

      const result = parseSectionContent(section);

      expect(result.aliases).toHaveLength(0);
      expect(result.exports).toHaveLength(0);
      expect(result.otherLines).toHaveLength(0);
    });

    it("should filter out empty and whitespace-only lines from otherLines", () => {
      const section = createSection({
        content: `setopt AUTO_CD


setopt HIST_IGNORE_DUPS`,
      });

      const result = parseSectionContent(section);

      expect(result.otherLines).toHaveLength(2);
      expect(result.otherLines).toContain("setopt AUTO_CD");
      expect(result.otherLines).toContain("setopt HIST_IGNORE_DUPS");
    });
  });

  describe("applyContentFilter", () => {
    const mockContent: ParsedSectionContent = {
      aliases: [{ name: "ll", command: "ls -la" }],
      exports: [{ variable: "PATH", value: "/usr/bin" }],
      otherLines: ["setopt AUTO_CD"],
    };

    it("should return all content when filter is 'all'", () => {
      const result = applyContentFilter(mockContent, "all");

      expect(result.aliases).toHaveLength(1);
      expect(result.exports).toHaveLength(1);
      expect(result.otherLines).toHaveLength(1);
    });

    it("should filter to only aliases when filter is 'aliases'", () => {
      const result = applyContentFilter(mockContent, "aliases");

      expect(result.aliases).toHaveLength(1);
      expect(result.exports).toHaveLength(0);
      expect(result.otherLines).toHaveLength(0);
    });

    it("should filter to only exports when filter is 'exports'", () => {
      const result = applyContentFilter(mockContent, "exports");

      expect(result.aliases).toHaveLength(0);
      expect(result.exports).toHaveLength(1);
      expect(result.otherLines).toHaveLength(0);
    });

    it("should default to 'all' when no filter specified", () => {
      const result = applyContentFilter(mockContent);

      expect(result.aliases).toHaveLength(1);
      expect(result.exports).toHaveLength(1);
      expect(result.otherLines).toHaveLength(1);
    });
  });

  describe("generateRawMarkdown", () => {
    it("should generate markdown with section label as title", () => {
      const section = createSection({
        label: "My Aliases",
        content: "alias ll='ls -la'",
      });

      const result = generateRawMarkdown(section);

      expect(result).toContain("# My Aliases");
    });

    it("should include line numbers", () => {
      const section = createSection({
        startLine: 15,
        endLine: 25,
      });

      const result = generateRawMarkdown(section);

      expect(result).toContain("**Lines:** 15-25");
    });

    it("should include raw content in code block", () => {
      const section = createSection({
        content: `alias ll='ls -la'
alias gs='git status'`,
      });

      const result = generateRawMarkdown(section);

      expect(result).toContain("```zsh");
      expect(result).toContain("alias ll='ls -la'");
      expect(result).toContain("alias gs='git status'");
    });

    it("should handle special characters in content", () => {
      const section = createSection({
        content: `alias test='echo "hello" | grep "world"'`,
      });

      const result = generateRawMarkdown(section);

      expect(result).toContain(`alias test='echo "hello" | grep "world"'`);
    });
  });

  describe("generateCompactMarkdown", () => {
    it("should include section statistics", () => {
      const section = createSection({ label: "Config" });
      const content: ParsedSectionContent = {
        aliases: [
          { name: "a1", command: "cmd1" },
          { name: "a2", command: "cmd2" },
        ],
        exports: [{ variable: "VAR", value: "val" }],
        otherLines: [],
      };

      const result = generateCompactMarkdown(section, content);

      expect(result).toContain("**Aliases:** 2");
      expect(result).toContain("**Exports:** 1");
    });

    it("should render aliases in compact inline format", () => {
      const section = createSection();
      const content: ParsedSectionContent = {
        aliases: [
          { name: "ll", command: "ls -la" },
          { name: "gs", command: "git status" },
        ],
        exports: [],
        otherLines: [],
      };

      const result = generateCompactMarkdown(section, content);

      expect(result).toContain("`ll` → `ls -la`");
      expect(result).toContain("`gs` → `git status`");
      expect(result).toContain("|"); // Inline separator
    });

    it("should render exports in compact inline format", () => {
      const section = createSection();
      const content: ParsedSectionContent = {
        aliases: [],
        exports: [
          { variable: "PATH", value: "/usr/bin" },
          { variable: "EDITOR", value: "vim" },
        ],
        otherLines: [],
      };

      const result = generateCompactMarkdown(section, content);

      expect(result).toContain("`PATH` = `/usr/bin`");
      expect(result).toContain("`EDITOR` = `vim`");
    });

    it("should render other configuration in code block", () => {
      const section = createSection();
      const content: ParsedSectionContent = {
        aliases: [],
        exports: [],
        otherLines: ["setopt AUTO_CD", "setopt HIST_IGNORE_DUPS"],
      };

      const result = generateCompactMarkdown(section, content);

      expect(result).toContain("```zsh");
      expect(result).toContain("setopt AUTO_CD");
      expect(result).toContain("setopt HIST_IGNORE_DUPS");
    });

    it("should omit empty sections", () => {
      const section = createSection();
      const content: ParsedSectionContent = {
        aliases: [{ name: "ll", command: "ls -la" }],
        exports: [],
        otherLines: [],
      };

      const result = generateCompactMarkdown(section, content);

      expect(result).toContain("## 🖥️ Aliases");
      expect(result).not.toContain("## 📦 Exports");
      expect(result).not.toContain("## ⚙️ Other Configuration");
    });
  });

  describe("generateFormattedMarkdown", () => {
    it("should render aliases as bullet list", () => {
      const section = createSection();
      const content: ParsedSectionContent = {
        aliases: [
          { name: "ll", command: "ls -la" },
          { name: "gs", command: "git status" },
        ],
        exports: [],
        otherLines: [],
      };

      const result = generateFormattedMarkdown(section, content);

      expect(result).toContain("- **`ll`** → `ls -la`");
      expect(result).toContain("- **`gs`** → `git status`");
    });

    it("should render exports as bullet list", () => {
      const section = createSection();
      const content: ParsedSectionContent = {
        aliases: [],
        exports: [
          { variable: "PATH", value: "/usr/bin" },
          { variable: "EDITOR", value: "vim" },
        ],
        otherLines: [],
      };

      const result = generateFormattedMarkdown(section, content);

      expect(result).toContain("- **`PATH`** = `/usr/bin`");
      expect(result).toContain("- **`EDITOR`** = `vim`");
    });

    it("should include raw content section", () => {
      const section = createSection({
        content: `alias ll='ls -la'
export PATH=/usr/bin`,
      });
      const content: ParsedSectionContent = {
        aliases: [{ name: "ll", command: "ls -la" }],
        exports: [{ variable: "PATH", value: "/usr/bin" }],
        otherLines: [],
      };

      const result = generateFormattedMarkdown(section, content);

      expect(result).toContain("## 📋 Raw Content");
      expect(result).toContain("alias ll='ls -la'");
    });

    it("should include separators between sections", () => {
      const section = createSection();
      const content: ParsedSectionContent = {
        aliases: [{ name: "ll", command: "ls -la" }],
        exports: [{ variable: "PATH", value: "/usr/bin" }],
        otherLines: [],
      };

      const result = generateFormattedMarkdown(section, content);

      expect(result).toContain("---");
    });
  });

  describe("generateSectionMarkdown", () => {
    it("should delegate to raw markdown for 'raw' mode", () => {
      const section = createSection({
        content: "alias ll='ls -la'",
      });

      const result = generateSectionMarkdown(section, "raw");

      expect(result).toContain("## 📋 Raw Content");
      expect(result).not.toContain("## 🖥️ Aliases");
    });

    it("should delegate to compact markdown for 'compact' mode", () => {
      const section = createSection({
        content: "alias ll='ls -la'",
      });

      const result = generateSectionMarkdown(section, "compact");

      expect(result).toContain("## 🖥️ Aliases");
      expect(result).toContain("|"); // Inline format indicator
    });

    it("should delegate to formatted markdown for 'formatted' mode", () => {
      const section = createSection({
        content: "alias ll='ls -la'",
      });

      const result = generateSectionMarkdown(section, "formatted");

      expect(result).toContain("## 🖥️ Aliases");
      expect(result).toContain("- **`ll`**");
    });

    it("should default to formatted mode", () => {
      const section = createSection({
        content: "alias ll='ls -la'",
      });

      const result = generateSectionMarkdown(section);

      expect(result).toContain("- **`ll`**");
    });

    it("should use provided pre-parsed content", () => {
      const section = createSection({ content: "" });
      const customContent: ParsedSectionContent = {
        aliases: [{ name: "custom", command: "command" }],
        exports: [],
        otherLines: [],
      };

      const result = generateSectionMarkdown(section, "formatted", customContent);

      expect(result).toContain("`custom`");
    });
  });

  describe("edge cases", () => {
    it("should handle aliases with special characters in commands", () => {
      const section = createSection({
        content: `alias test='echo "hello \`world\`" | grep -E "[a-z]+"'`,
      });

      const content = parseSectionContent(section);

      expect(content.aliases).toHaveLength(1);
    });

    it("should handle exports with complex values", () => {
      const section = createSection({
        content: `export PATH="$HOME/bin:$PATH:/usr/local/bin"`,
      });

      const content = parseSectionContent(section);

      expect(content.exports).toHaveLength(1);
      expect(content.exports[0]!.value).toContain("$HOME");
    });

    it("should handle mixed content types", () => {
      const section = createSection({
        content: `# My config
alias ll='ls -la'
export EDITOR=vim
setopt AUTO_CD
alias gs='git status'
export PATH=/usr/bin`,
      });

      const content = parseSectionContent(section);

      expect(content.aliases).toHaveLength(2);
      expect(content.exports).toHaveLength(2);
      expect(content.otherLines).toContain("setopt AUTO_CD");
    });

    it("should handle section with very long values", () => {
      const longCommand = "a".repeat(500);
      const section = createSection({
        label: "Long Commands",
        content: `alias long='${longCommand}'`,
      });

      const result = generateFormattedMarkdown(section, parseSectionContent(section));

      expect(result).toContain(longCommand);
    });

    it("should handle section with Unicode characters", () => {
      const section = createSection({
        label: "日本語セクション",
        content: `alias emoji='echo 🚀'`,
      });

      const result = generateRawMarkdown(section);

      expect(result).toContain("# 日本語セクション");
      expect(result).toContain("🚀");
    });
  });
});
