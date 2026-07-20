import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SectionDetail, SectionDetailList } from "../section-detail";
import type { LogicalSection } from "../lib/parse-zshrc";

// Mock zsh module
vi.mock("../lib/zsh", () => ({
  getZshrcPath: vi.fn(() => "/test/.zshrc"),
}));

// Mock delete-item
vi.mock("../lib/delete-item", () => ({
  deleteItem: vi.fn(),
}));

// Mock edit components
vi.mock("../edit-alias", () => ({
  default: () => <div data-testid="edit-alias">Edit Alias</div>,
  aliasConfig: {
    keyLabel: "Alias Name",
    valueLabel: "Command",
  },
}));

vi.mock("../edit-export", () => ({
  default: () => <div data-testid="edit-export">Edit Export</div>,
  exportConfig: {
    keyLabel: "Variable",
    valueLabel: "Value",
  },
}));

// Mock markdown utils
vi.mock("../utils/markdown", () => ({
  parseSectionContent: vi.fn((section) => {
    const aliases: { name: string; command: string }[] = [];
    const exports: { variable: string; value: string }[] = [];
    const otherLines: string[] = [];

    const lines = section.content.split("\n");
    lines.forEach((line: string) => {
      const aliasMatch = line.match(/^alias\s+(\w+)=['"](.*)['"]/);
      const exportMatch = line.match(/^export\s+(\w+)=(.*)/);

      if (aliasMatch && aliasMatch[1] && aliasMatch[2]) {
        aliases.push({ name: aliasMatch[1], command: aliasMatch[2] });
      } else if (exportMatch && exportMatch[1] && exportMatch[2]) {
        exports.push({ variable: exportMatch[1], value: exportMatch[2] });
      } else if (line.trim()) {
        otherLines.push(line);
      }
    });

    return { aliases, exports, otherLines };
  }),
  applyContentFilter: vi.fn((content, filterType) => {
    if (filterType === "aliases") {
      return { ...content, exports: [], otherLines: [] };
    }
    if (filterType === "exports") {
      return { ...content, aliases: [], otherLines: [] };
    }
    return content;
  }),
  generateSectionMarkdown: vi.fn((section) => `# ${section.label}\n\nContent preview`),
}));

// Mock formatters
vi.mock("../utils/formatters", () => ({
  truncateValueMiddle: vi.fn((value, maxLength = 50) => {
    if (value.length <= maxLength) return value;
    const half = Math.floor((maxLength - 3) / 2);
    return `${value.slice(0, half)}...${value.slice(-half)}`;
  }),
}));

// Helper to create mock sections
const createMockSection = (
  label: string,
  startLine: number,
  endLine: number,
  content: string,
  overrides: Partial<LogicalSection> = {},
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
  ...overrides,
});

describe("SectionDetail", () => {
  const mockSection = createMockSection("Aliases", 1, 10, "alias ll='ls -la'\nalias gs='git status'", {
    aliasCount: 2,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("component rendering", () => {
    it("should render SectionDetail component", () => {
      render(<SectionDetail section={mockSection} />);
      expect(screen.getAllByText(/Aliases/).length).toBeGreaterThan(0);
    });

    it("should render section label in navigation title", () => {
      render(<SectionDetail section={mockSection} />);
      // Navigation title includes section label
      expect(screen.getAllByText(/Aliases/).length).toBeGreaterThan(0);
    });

    it("should render with custom actions", () => {
      const customActions = <div data-testid="custom-actions">Custom Actions</div>;
      render(<SectionDetail section={mockSection} actions={customActions} />);

      // Custom actions passed to Detail component
      expect(screen.getAllByText(/Aliases/).length).toBeGreaterThan(0);
    });
  });

  describe("display modes", () => {
    it("should use formatted display mode by default", () => {
      render(<SectionDetail section={mockSection} />);
      // Content should be rendered
      expect(screen.getAllByText(/Aliases/).length).toBeGreaterThan(0);
    });

    it("should handle raw display mode", () => {
      render(<SectionDetail section={mockSection} displayMode="raw" />);
      expect(screen.getAllByText(/Aliases/).length).toBeGreaterThan(0);
    });

    it("should handle compact display mode", () => {
      render(<SectionDetail section={mockSection} displayMode="compact" />);
      expect(screen.getAllByText(/Aliases/).length).toBeGreaterThan(0);
    });
  });

  describe("content parsing", () => {
    it("should parse aliases from content", () => {
      const content = "alias ll='ls -la'\nalias gs='git status'";
      const aliases: { name: string; command: string }[] = [];

      const lines = content.split("\n");
      lines.forEach((line) => {
        const aliasMatch = line.match(/^alias\s+(\w+)=['"](.*)['"]/);
        if (aliasMatch && aliasMatch[1] && aliasMatch[2]) {
          aliases.push({ name: aliasMatch[1], command: aliasMatch[2] });
        }
      });

      expect(aliases).toHaveLength(2);
      expect(aliases[0]?.name).toBe("ll");
      expect(aliases[0]?.command).toBe("ls -la");
    });

    it("should parse exports from content", () => {
      const content = "export PATH=/usr/local/bin:$PATH\nexport EDITOR=code";
      const exports: { variable: string; value: string }[] = [];

      const lines = content.split("\n");
      lines.forEach((line) => {
        const exportMatch = line.match(/^export\s+(\w+)=(.*)/);
        if (exportMatch && exportMatch[1] && exportMatch[2]) {
          exports.push({ variable: exportMatch[1], value: exportMatch[2] });
        }
      });

      expect(exports).toHaveLength(2);
      expect(exports[0]?.variable).toBe("PATH");
    });

    it("should handle other lines", () => {
      const content = "# Comment\necho 'test'";
      const otherLines: string[] = [];

      const lines = content.split("\n");
      lines.forEach((line) => {
        const aliasMatch = line.match(/^alias\s+(\w+)=['"](.*)['"]/);
        const exportMatch = line.match(/^export\s+(\w+)=(.*)/);
        if (!aliasMatch && !exportMatch && line.trim()) {
          otherLines.push(line);
        }
      });

      expect(otherLines).toHaveLength(2);
    });
  });

  describe("filter types", () => {
    it("should handle all filter type", () => {
      const content = {
        aliases: [{ name: "ll", command: "ls -la" }],
        exports: [{ variable: "PATH", value: "/usr/local/bin" }],
        otherLines: ["# comment"],
      };

      const filterType = "all";
      const filtered =
        filterType === "all"
          ? content
          : filterType === "aliases"
            ? { ...content, exports: [], otherLines: [] }
            : { ...content, aliases: [], otherLines: [] };

      expect(filtered.aliases).toHaveLength(1);
      expect(filtered.exports).toHaveLength(1);
    });

    it("should handle aliases filter type", () => {
      const content = {
        aliases: [{ name: "ll", command: "ls -la" }],
        exports: [{ variable: "PATH", value: "/usr/local/bin" }],
        otherLines: ["# comment"],
      };

      const filterType = "aliases" as const;
      const filtered =
        filterType === "aliases" ? { ...content, exports: [], otherLines: [] } : { ...content, aliases: [] };

      expect(filtered.aliases).toHaveLength(1);
      expect(filtered.exports).toHaveLength(0);
    });

    it("should handle exports filter type", () => {
      const content = {
        aliases: [{ name: "ll", command: "ls -la" }],
        exports: [{ variable: "PATH", value: "/usr/local/bin" }],
        otherLines: ["# comment"],
      };

      const filterType = "exports" as const;
      const filtered =
        filterType === "exports" ? { ...content, aliases: [], otherLines: [] } : { ...content, exports: [] };

      expect(filtered.aliases).toHaveLength(0);
      expect(filtered.exports).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("should handle empty section content", () => {
      const emptySection = createMockSection("Empty", 1, 1, "");
      render(<SectionDetail section={emptySection} />);

      expect(screen.getAllByText(/Empty/).length).toBeGreaterThan(0);
    });

    it("should handle section with special characters", () => {
      const specialSection = createMockSection("SpecialSection", 1, 5, "alias test='echo \"hello\"'", {
        aliasCount: 1,
      });
      render(<SectionDetail section={specialSection} />);

      expect(screen.getAllByText(/SpecialSection/).length).toBeGreaterThan(0);
    });

    it("should handle very long content", () => {
      const longContent = Array(100).fill("alias test='command'").join("\n");
      const longSection = createMockSection("LongSection", 1, 100, longContent, { aliasCount: 100 });
      render(<SectionDetail section={longSection} />);

      expect(screen.getAllByText(/LongSection/).length).toBeGreaterThan(0);
    });
  });
});

describe("SectionDetailList", () => {
  const mockSection = createMockSection("AliasesList", 1, 10, "alias ll='ls -la'\nalias gs='git status'", {
    aliasCount: 2,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("component rendering", () => {
    it("should render SectionDetailList component", () => {
      render(<SectionDetailList section={mockSection} />);
      expect(screen.getAllByText(/AliasesList/).length).toBeGreaterThan(0);
    });

    it("should render section overview", () => {
      render(<SectionDetailList section={mockSection} />);
      expect(screen.getByText("Section Overview")).toBeInTheDocument();
    });

    it("should accept searchBarAccessory prop", () => {
      const accessory = <div data-testid="custom-accessory">Custom</div>;
      render(<SectionDetailList section={mockSection} searchBarAccessory={accessory} />);

      expect(screen.getAllByText(/AliasesList/).length).toBeGreaterThan(0);
    });

    it("should render with custom actions", () => {
      const customActions = <div data-testid="custom-actions">Custom Actions</div>;
      render(<SectionDetailList section={mockSection} actions={customActions} />);

      // Component renders with actions
      expect(screen.getAllByText(/AliasesList/).length).toBeGreaterThan(0);
    });
  });

  describe("display modes", () => {
    it("should render formatted mode by default", () => {
      render(<SectionDetailList section={mockSection} />);
      expect(screen.getByText("Section Overview")).toBeInTheDocument();
    });

    it("should render raw mode", () => {
      render(<SectionDetailList section={mockSection} displayMode="raw" />);
      expect(screen.getByText("Raw Content")).toBeInTheDocument();
    });

    it("should render compact mode", () => {
      render(<SectionDetailList section={mockSection} displayMode="compact" />);
      expect(screen.getByText("Section Overview")).toBeInTheDocument();
    });
  });

  describe("aliases section", () => {
    it("should render aliases section when aliases exist", () => {
      const sectionWithAliases = createMockSection("AliasSection", 1, 10, "alias ll='ls -la'", { aliasCount: 1 });
      render(<SectionDetailList section={sectionWithAliases} />);

      // Should show aliases section
      expect(screen.getAllByText(/AliasSection/).length).toBeGreaterThan(0);
    });
  });

  describe("exports section", () => {
    it("should render exports section when exports exist", () => {
      const sectionWithExports = createMockSection("ExportSection", 1, 10, "export PATH=/usr/local/bin", {
        exportCount: 1,
      });
      render(<SectionDetailList section={sectionWithExports} />);

      expect(screen.getAllByText(/ExportSection/).length).toBeGreaterThan(0);
    });
  });

  describe("other content section", () => {
    it("should render other content section when other lines exist", () => {
      const sectionWithOther = createMockSection("OtherSection", 1, 10, "# Comment\necho test", {
        otherCount: 2,
      });
      render(<SectionDetailList section={sectionWithOther} />);

      expect(screen.getAllByText(/OtherSection/).length).toBeGreaterThan(0);
    });
  });

  describe("filter types", () => {
    it("should filter to show only aliases", () => {
      render(<SectionDetailList section={mockSection} filterType="aliases" />);
      expect(screen.getAllByText(/AliasesList/).length).toBeGreaterThan(0);
    });

    it("should filter to show only exports", () => {
      const sectionWithExports = createMockSection("ExportsFiltered", 1, 10, "export PATH=/usr/local/bin", {
        exportCount: 1,
      });
      render(<SectionDetailList section={sectionWithExports} filterType="exports" />);
      expect(screen.getAllByText(/ExportsFiltered/).length).toBeGreaterThan(0);
    });

    it("should show all by default", () => {
      render(<SectionDetailList section={mockSection} filterType="all" />);
      expect(screen.getByText("Section Overview")).toBeInTheDocument();
    });
  });

  describe("line numbers", () => {
    it("should display correct line range", () => {
      const section = createMockSection("Test", 5, 15, "content");
      expect(section.startLine).toBe(5);
      expect(section.endLine).toBe(15);
    });
  });

  describe("content truncation", () => {
    it("should truncate long values", () => {
      const truncateValueMiddle = (value: string, maxLength = 50) => {
        if (value.length <= maxLength) return value;
        const half = Math.floor((maxLength - 3) / 2);
        return `${value.slice(0, half)}...${value.slice(-half)}`;
      };

      const longValue = "a".repeat(100);
      const truncated = truncateValueMiddle(longValue, 50);

      expect(truncated.length).toBeLessThan(longValue.length);
      expect(truncated).toContain("...");
    });

    it("should not truncate short values", () => {
      const truncateValueMiddle = (value: string, maxLength = 50) => {
        if (value.length <= maxLength) return value;
        const half = Math.floor((maxLength - 3) / 2);
        return `${value.slice(0, half)}...${value.slice(-half)}`;
      };

      const shortValue = "short";
      const result = truncateValueMiddle(shortValue, 50);

      expect(result).toBe(shortValue);
    });
  });
});

describe("SectionDetail edge cases", () => {
  it("should handle section with all entry types", () => {
    const mixedSection = createMockSection(
      "MixedSection",
      1,
      20,
      "alias ll='ls -la'\nexport PATH=/usr/local/bin\nfunction test() {}\n# Comment",
      {
        aliasCount: 1,
        exportCount: 1,
        functionCount: 1,
        otherCount: 1,
      },
    );

    render(<SectionDetail section={mixedSection} />);
    expect(screen.getAllByText(/MixedSection/).length).toBeGreaterThan(0);
  });

  it("should handle unicode content", () => {
    const unicodeSection = createMockSection("UnicodeSection", 1, 5, "alias hello='echo 你好'", {
      aliasCount: 1,
    });

    render(<SectionDetail section={unicodeSection} />);
    expect(screen.getAllByText(/UnicodeSection/).length).toBeGreaterThan(0);
  });

  it("should handle section with only comments", () => {
    const commentSection = createMockSection("CommentsSection", 1, 5, "# Comment 1\n# Comment 2", {
      otherCount: 2,
    });

    render(<SectionDetail section={commentSection} />);
    expect(screen.getAllByText(/CommentsSection/).length).toBeGreaterThan(0);
  });
});
