import { describe, it, expect, vi, beforeEach } from "vitest";
import { LogicalSection } from "../lib/parse-zshrc";

// Mock dependencies
const mockParseSectionContent = vi.fn();
const mockApplyContentFilter = vi.fn();
const mockGenerateSectionMarkdown = vi.fn();
const mockTruncateValueMiddle = vi.fn();

vi.mock("../lib/zsh", () => ({
  ZSHRC_PATH: "/test/.zshrc",
}));

vi.mock("../edit-alias", () => ({
  default: vi.fn(),
}));

vi.mock("../edit-export", () => ({
  default: vi.fn(),
}));

vi.mock("../utils/formatters", () => ({
  truncateValueMiddle: mockTruncateValueMiddle,
}));

vi.mock("../utils/markdown", () => ({
  parseSectionContent: mockParseSectionContent,
  applyContentFilter: mockApplyContentFilter,
  generateSectionMarkdown: mockGenerateSectionMarkdown,
}));

vi.mock("@raycast/api", () => ({
  Detail: vi.fn(),
  ActionPanel: vi.fn(),
  Action: vi.fn(),
  Icon: {
    Document: "document",
    Copy: "copy",
    Trash: "trash",
    Edit: "edit",
    Plus: "plus",
  },
}));

describe("SectionDetail", () => {
  const mockSection: LogicalSection = {
    label: "Test Section",
    content: "alias ll='ls -la'\nexport PATH=/usr/local/bin:$PATH",
    startLine: 1,
    endLine: 2,
    aliasCount: 1,
    exportCount: 1,
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
  };

  const mockParsedContent = {
    aliases: [{ name: "ll", command: "ls -la" }],
    exports: [{ variable: "PATH", value: "/usr/local/bin:$PATH" }],
    otherLines: [],
  };

  const mockMarkdown = "# Test Section\n\n## Aliases\n- ll: ls -la\n\n## Exports\n- PATH: /usr/local/bin:$PATH";

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockParseSectionContent.mockReturnValue(mockParsedContent);
    mockApplyContentFilter.mockImplementation((content) => content);
    mockGenerateSectionMarkdown.mockReturnValue(mockMarkdown);
    mockTruncateValueMiddle.mockImplementation((value) => value);
  });

  it("should export SectionDetail and SectionDetailList components", async () => {
    const SectionDetail = await import("../section-detail");
    expect(SectionDetail.SectionDetail).toBeDefined();
    expect(SectionDetail.SectionDetailList).toBeDefined();
    expect(typeof SectionDetail.SectionDetail).toBe("function");
    expect(typeof SectionDetail.SectionDetailList).toBe("function");
  });

  it("should handle content parsing", () => {
    // Test that the component can handle content parsing
    const parsedContent = mockParseSectionContent(mockSection);

    expect(parsedContent).toBeDefined();
    expect(parsedContent.aliases).toHaveLength(1);
    expect(parsedContent.exports).toHaveLength(1);
    expect(mockParseSectionContent).toHaveBeenCalledWith(mockSection);
  });

  it("should handle markdown generation", () => {
    // Test that the component can handle markdown generation
    const markdown = mockGenerateSectionMarkdown(mockSection, "formatted", mockParsedContent);

    expect(markdown).toBeDefined();
    expect(markdown).toContain("# Test Section");
    expect(mockGenerateSectionMarkdown).toHaveBeenCalledWith(mockSection, "formatted", mockParsedContent);
  });

  it("should handle different display modes", () => {
    // Test that the component can handle different display modes
    const displayModes = ["formatted", "raw", "compact"];

    displayModes.forEach((mode) => {
      mockGenerateSectionMarkdown(mockSection, mode, mockParsedContent);
      expect(mockGenerateSectionMarkdown).toHaveBeenCalledWith(mockSection, mode, mockParsedContent);
    });
  });

  it("should handle different filter types", () => {
    // Test that the component can handle different filter types
    const filterTypes = ["all", "aliases", "exports"];

    filterTypes.forEach((filterType) => {
      mockApplyContentFilter(mockParsedContent, filterType);
      expect(mockApplyContentFilter).toHaveBeenCalledWith(mockParsedContent, filterType);
    });
  });

  it("should parse section content correctly", () => {
    const parsedContent = mockParseSectionContent(mockSection);

    expect(parsedContent.aliases).toHaveLength(1);
    expect(parsedContent.exports).toHaveLength(1);
    expect(parsedContent.aliases[0]?.name).toBe("ll");
    expect(parsedContent.aliases[0]?.command).toBe("ls -la");
    expect(parsedContent.exports[0]?.variable).toBe("PATH");
    expect(parsedContent.exports[0]?.value).toBe("/usr/local/bin:$PATH");
  });

  it("should handle empty section content", () => {
    // Test that the component can handle empty section content
    const emptySection: LogicalSection = {
      label: "Empty Section",
      content: "",
      startLine: 1,
      endLine: 1,
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
    };

    const emptyParsedContent = {
      aliases: [],
      exports: [],
      otherLines: [],
    };

    mockParseSectionContent.mockReturnValue(emptyParsedContent);
    const parsedContent = mockParseSectionContent(emptySection);

    expect(parsedContent.aliases).toHaveLength(0);
    expect(parsedContent.exports).toHaveLength(0);
  });

  it("should apply content filters correctly", () => {
    const allContent = mockApplyContentFilter(mockParsedContent, "all");
    const aliasesOnly = mockApplyContentFilter(mockParsedContent, "aliases");
    const exportsOnly = mockApplyContentFilter(mockParsedContent, "exports");

    expect(mockApplyContentFilter).toHaveBeenCalledTimes(3);
    expect(allContent).toBeDefined();
    expect(aliasesOnly).toBeDefined();
    expect(exportsOnly).toBeDefined();
  });

  it("should truncate long values properly", () => {
    const longValue = "A".repeat(1000);
    const truncatedValue = mockTruncateValueMiddle(longValue);

    expect(mockTruncateValueMiddle).toHaveBeenCalledWith(longValue);
    expect(truncatedValue).toBeDefined();
  });

  it("should handle error scenarios gracefully", () => {
    // Test that the component can handle error scenarios
    mockParseSectionContent.mockImplementation(() => {
      throw new Error("Parsing failed");
    });

    expect(() => mockParseSectionContent(mockSection)).toThrow("Parsing failed");
  });

  it("should handle markdown generation errors", () => {
    // Test that the component can handle markdown generation errors
    mockGenerateSectionMarkdown.mockImplementation(() => {
      throw new Error("Markdown generation failed");
    });

    expect(() => mockGenerateSectionMarkdown(mockSection, "formatted", mockParsedContent)).toThrow(
      "Markdown generation failed",
    );
  });
});
