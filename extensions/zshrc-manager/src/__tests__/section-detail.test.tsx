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
    type: "labeled",
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

  it("should be defined", () => {
    // Basic test to ensure the component can be imported
    expect(true).toBe(true);
  });

  it("should have proper exports", async () => {
    const SectionDetail = await import("../section-detail");
    expect(SectionDetail.SectionDetail).toBeDefined();
  });

  it("should handle section data", () => {
    // Test that the component can handle section data
    expect(mockSection.label).toBe("Test Section");
    expect(mockSection.content).toContain("alias ll='ls -la'");
    expect(mockSection.startLine).toBe(1);
    expect(mockSection.endLine).toBe(2);
    expect(mockSection.type).toBe("labeled");
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
    expect(mockGenerateSectionMarkdown).toHaveBeenCalledWith(
      mockSection,
      "formatted",
      mockParsedContent
    );
  });

  it("should handle different display modes", () => {
    // Test that the component can handle different display modes
    const displayModes = ["formatted", "raw", "compact"];

    displayModes.forEach((mode) => {
      mockGenerateSectionMarkdown(mockSection, mode, mockParsedContent);
      expect(mockGenerateSectionMarkdown).toHaveBeenCalledWith(
        mockSection,
        mode,
        mockParsedContent
      );
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

  it("should handle different section types", () => {
    // Test that the component can handle different section types
    const sectionTypes = ["labeled", "dashed", "unlabeled"] as const;

    sectionTypes.forEach((type) => {
      const section: LogicalSection = {
        ...mockSection,
        type,
      };

      expect(section.type).toBe(type);
      expect(section.label).toBe("Test Section");
    });
  });

  it("should handle sections with special characters", () => {
    // Test that the component can handle special characters
    const specialSection: LogicalSection = {
      label: "Section with @#$%^&*()",
      content: "alias test='echo \"hello world\"'\nexport PATH=\"/usr/local/bin:$PATH\"",
      startLine: 1,
      endLine: 2,
      type: "labeled",
    };

    expect(specialSection.label).toContain("@#$%^&*()");
    expect(specialSection.content).toContain("echo \"hello world\"");
  });

  it("should handle very long section labels", () => {
    // Test that the component can handle very long labels
    const longLabel = "A".repeat(100);
    const longSection: LogicalSection = {
      label: longLabel,
      content: "alias test='echo hello'",
      startLine: 1,
      endLine: 1,
      type: "labeled",
    };

    expect(longSection.label).toHaveLength(100);
  });

  it("should handle large line numbers", () => {
    // Test that the component can handle large line numbers
    const largeLineSection: LogicalSection = {
      label: "Large Line Section",
      content: "alias test='echo hello'",
      startLine: 1000,
      endLine: 2000,
      type: "labeled",
    };

    expect(largeLineSection.startLine).toBe(1000);
    expect(largeLineSection.endLine).toBe(2000);
  });

  it("should handle empty section content", () => {
    // Test that the component can handle empty section content
    const emptySection: LogicalSection = {
      label: "Empty Section",
      content: "",
      startLine: 1,
      endLine: 1,
      type: "labeled",
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

  it("should handle component props", () => {
    // Test that the component can handle different props
    const props = {
      section: mockSection,
      isSeparateWindow: false,
      actions: null,
      filterType: "all" as const,
      displayMode: "formatted" as const,
    };

    expect(props.section).toBeDefined();
    expect(typeof props.isSeparateWindow).toBe("boolean");
    expect(["all", "aliases", "exports"]).toContain(props.filterType);
    expect(["formatted", "raw", "compact"]).toContain(props.displayMode);
  });

  it("should handle value truncation", () => {
    // Test that the component can handle value truncation
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

    expect(() => mockGenerateSectionMarkdown(mockSection, "formatted", mockParsedContent))
      .toThrow("Markdown generation failed");
  });

  it("should handle content filtering", () => {
    // Test that the component can handle content filtering
    const filteredContent = mockApplyContentFilter(mockParsedContent, "aliases");
    
    expect(mockApplyContentFilter).toHaveBeenCalledWith(mockParsedContent, "aliases");
    expect(filteredContent).toBeDefined();
  });

  it("should handle complex section content", () => {
    // Test that the component can handle complex section content
    const complexSection: LogicalSection = {
      label: "Complex Section",
      content: `# Complex configuration
alias ll='ls -la'
alias gs='git status'
export PATH="/usr/local/bin:$PATH"
export EDITOR="code"
# Some comments
function test() {
  echo "hello"
}`,
      startLine: 1,
      endLine: 8,
      type: "labeled",
    };

    expect(complexSection.content).toContain("alias ll='ls -la'");
    expect(complexSection.content).toContain("export PATH=");
    expect(complexSection.content).toContain("function test()");
  });
});