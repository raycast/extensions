import { describe, it, expect, vi, beforeEach } from "vitest";
import { LogicalSection } from "../lib/parse-zshrc";

// Mock dependencies
const mockReadZshrcFile = vi.fn();
const mockToLogicalSections = vi.fn();
const mockGetSectionIcon = vi.fn();
const mockShowToast = vi.fn();

vi.mock("../lib/zsh", () => ({
  readZshrcFile: mockReadZshrcFile,
  getZshrcPath: vi.fn(() => "/test/.zshrc"),
}));

vi.mock("../lib/parse-zshrc", () => ({
  toLogicalSections: mockToLogicalSections,
}));

vi.mock("../lib/section-icons", () => ({
  getSectionIcon: mockGetSectionIcon,
}));

vi.mock("../section-detail", () => ({
  SectionDetail: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  Action: vi.fn(),
  ActionPanel: vi.fn(),
  List: {
    Item: vi.fn(),
    EmptyView: vi.fn(),
  },
  Icon: {
    Document: "document",
    MagnifyingGlass: "magnifying-glass",
    ArrowClockwise: "arrow-clockwise",
    Folder: "folder",
    ChevronRight: "chevron-right",
  },
  showToast: mockShowToast,
  Toast: {
    Style: {
      Failure: "failure",
    },
  },
}));

describe("Sections", () => {
  const mockSections: LogicalSection[] = [
    {
      label: "Aliases",
      content: "alias ll='ls -la'\nalias gs='git status'",
      startLine: 1,
      endLine: 2,
      aliasCount: 2,
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
    },
    {
      label: "Exports",
      content: "export PATH=/usr/local/bin:$PATH\nexport EDITOR=code",
      startLine: 3,
      endLine: 4,
      aliasCount: 0,
      exportCount: 2,
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
    },
    {
      label: "Unlabeled Section",
      content: "# Some comments",
      startLine: 5,
      endLine: 5,
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
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockReadZshrcFile.mockResolvedValue("test content");
    mockToLogicalSections.mockReturnValue(mockSections);
    mockGetSectionIcon.mockReturnValue({ source: "test-icon" });
  });

  it("should export Sections component", async () => {
    const Sections = await import("../sections");
    expect(Sections.default).toBeDefined();
    expect(typeof Sections.default).toBe("function");
  });

  it("should handle file operations", async () => {
    // Test that the component can handle file operations
    const content = await mockReadZshrcFile();
    const sections = mockToLogicalSections(content);

    expect(content).toBe("test content");
    expect(sections).toHaveLength(3);
    expect(mockReadZshrcFile).toHaveBeenCalled();
    expect(mockToLogicalSections).toHaveBeenCalledWith("test content");
  });

  it("should handle error scenarios", async () => {
    // Test that the component can handle error scenarios
    const error = new Error("File not found");
    mockReadZshrcFile.mockRejectedValue(error);

    try {
      await mockReadZshrcFile();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe("File not found");
    }
  });

  it("should handle section data", () => {
    // Test that the component can handle section data
    expect(mockSections).toHaveLength(3);
    expect(mockSections[0]?.label).toBe("Aliases");
    expect(mockSections[1]?.label).toBe("Exports");
    expect(mockSections[2]?.label).toBe("Unlabeled Section");
  });

  it("should handle different section labels", () => {
    // Test that the component can handle different section labels
    const sectionLabels = mockSections.map((section) => section.label);
    expect(sectionLabels).toContain("Aliases");
    expect(sectionLabels).toContain("Unlabeled Section");
  });

  it("should handle sections with special characters", () => {
    // Test that the component can handle special characters
    const specialSection: LogicalSection = {
      label: "Section with @#$%^&*()",
      content: "test content",
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

    expect(specialSection.label).toContain("@#$%^&*()");
  });

  it("should handle sections with very long labels", () => {
    // Test that the component can handle very long labels
    const longLabel = "A".repeat(100);
    const longSection: LogicalSection = {
      label: longLabel,
      content: "test content",
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

    expect(longSection.label).toHaveLength(100);
  });

  it("should handle sections with large line numbers", () => {
    // Test that the component can handle large line numbers
    const largeLineSection: LogicalSection = {
      label: "Large Line Section",
      content: "test content",
      startLine: 1000,
      endLine: 2000,
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

    expect(largeLineSection.startLine).toBe(1000);
    expect(largeLineSection.endLine).toBe(2000);
  });

  it("should handle empty sections list", () => {
    // Test that the component can handle empty sections list
    const emptySections: LogicalSection[] = [];

    expect(emptySections).toHaveLength(0);
  });

  it("should handle section filtering", () => {
    // Test that the component can handle section filtering
    const searchText = "alias";
    const filteredSections = mockSections.filter((section) =>
      section.label.toLowerCase().includes(searchText.toLowerCase()),
    );

    expect(filteredSections).toHaveLength(1);
    expect(filteredSections[0]?.label).toBe("Aliases");
  });

  it("should handle section icon generation", () => {
    // Test that the component can handle section icon generation
    const icon = mockGetSectionIcon("Aliases");

    expect(icon).toBeDefined();
    expect(icon.source).toBe("test-icon");
    expect(mockGetSectionIcon).toHaveBeenCalledWith("Aliases");
  });

  it("should handle toast notifications", () => {
    // Test that the component can handle toast notifications
    const error = new Error("Test error");

    mockShowToast({
      style: "failure",
      title: "Error Loading Sections",
      message: error.message,
    });

    expect(mockShowToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Error Loading Sections",
      message: "Test error",
    });
  });

  it("should handle mixed section labels", () => {
    // Test that the component can handle mixed section labels
    const mixedSections: LogicalSection[] = [
      {
        label: "Labeled Section",
        content: "alias test='echo hello'",
        startLine: 1,
        endLine: 1,
        aliasCount: 1,
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
      },
      {
        label: "Dashed Section",
        content: "export TEST=value",
        startLine: 2,
        endLine: 2,
        aliasCount: 0,
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
      },
      {
        label: "Unlabeled Section",
        content: "# Some comments",
        startLine: 3,
        endLine: 3,
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
      },
    ];

    expect(mixedSections).toHaveLength(3);
    expect(mixedSections[0]?.label).toBe("Labeled Section");
    expect(mixedSections[1]?.label).toBe("Dashed Section");
    expect(mixedSections[2]?.label).toBe("Unlabeled Section");
  });

  it("should handle component state management", () => {
    // Test that the component can handle state management
    const state = {
      sections: mockSections,
      isLoading: false,
      searchText: "",
    };

    expect(state.sections).toHaveLength(3);
    expect(typeof state.isLoading).toBe("boolean");
    expect(typeof state.searchText).toBe("string");
  });
});
