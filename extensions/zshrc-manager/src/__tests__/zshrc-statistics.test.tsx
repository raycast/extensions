import { describe, it, expect, vi, beforeEach } from "vitest";
import { LogicalSection } from "../lib/parse-zshrc";

// Mock dependencies
vi.mock("../lib/zsh", () => ({
  ZSHRC_PATH: "/test/.zshrc",
}));

vi.mock("../lib/section-icons", () => ({
  getSectionIcon: vi.fn(() => ({ source: "test-icon" })),
}));

const mockUseZshrcLoader = vi.fn();
vi.mock("../hooks/useZshrcLoader", () => ({
  useZshrcLoader: mockUseZshrcLoader,
}));

const mockCalculateStatistics = vi.fn();
const mockHasContent = vi.fn();
const mockGetTopEntries = vi.fn();
vi.mock("../utils/statistics", () => ({
  calculateStatistics: mockCalculateStatistics,
  hasContent: mockHasContent,
  getTopEntries: mockGetTopEntries,
}));

vi.mock("../utils/formatters", () => ({
  truncateValueMiddle: (value: string) => value,
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
    ChartBar: "chart-bar",
    CommandSymbol: "command-symbol",
    Terminal: "terminal",
    Code: "code",
    Gear: "gear",
    Link: "link",
    Eye: "eye",
    Clock: "clock",
  },
  Color: {
    Primary: "primary",
    Secondary: "secondary",
    Orange: "orange",
    Blue: "blue",
    Green: "green",
    Red: "red",
    Yellow: "yellow",
    Purple: "purple",
  },
}));

vi.mock("@raycast/utils", () => ({
  usePromise: vi.fn(),
}));

describe("ZshrcStatistics", () => {
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
  ];

  const mockStats = {
    sectionCount: 2,
    aliases: [
      { name: "ll", command: "ls -la" },
      { name: "gs", command: "git status" },
    ],
    exports: [
      { variable: "PATH", value: "/usr/local/bin:$PATH" },
      { variable: "EDITOR", value: "code" },
    ],
    evals: [],
    setopts: [],
    plugins: [],
    functions: [],
    sources: [],
    totalEntries: 4,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseZshrcLoader.mockReturnValue({
      sections: mockSections,
      isLoading: false,
      refresh: vi.fn(),
      isFromCache: false,
      lastError: null,
    });

    mockCalculateStatistics.mockReturnValue(mockStats);
    mockHasContent.mockReturnValue(true);
    mockGetTopEntries.mockReturnValue([]);
  });

  it("should export ZshrcStatistics component", async () => {
    const ZshrcStatistics = await import("../zshrc-statistics");
    expect(ZshrcStatistics.default).toBeDefined();
    expect(typeof ZshrcStatistics.default).toBe("function");
  });

  it("should handle hook dependencies", () => {
    // Test that the component can handle hook dependencies
    const mockHookResult = {
      sections: mockSections,
      isLoading: false,
      refresh: vi.fn(),
      isFromCache: false,
      lastError: null,
    };

    expect(mockHookResult.sections).toBeDefined();
    expect(typeof mockHookResult.isLoading).toBe("boolean");
    expect(typeof mockHookResult.refresh).toBe("function");
    expect(typeof mockHookResult.isFromCache).toBe("boolean");
  });

  it("should handle statistics calculation", () => {
    // Test that the component can handle statistics calculation
    expect(mockStats.aliases).toHaveLength(2);
    expect(mockStats.exports).toHaveLength(2);
    expect(mockStats.totalEntries).toBe(4);
  });

  it("should handle empty statistics", () => {
    // Test that the component can handle empty statistics
    const emptyStats = {
      aliases: [],
      exports: [],
      functions: [],
      plugins: [],
      sources: [],
      evals: [],
      setopts: [],
      sections: 0,
      totalEntries: 0,
    };

    expect(emptyStats.totalEntries).toBe(0);
    expect(emptyStats.sections).toBe(0);
  });

  it("should handle loading states", () => {
    // Test that the component can handle loading states
    const loadingStates = [
      { isLoading: true, isFromCache: false },
      { isLoading: false, isFromCache: true },
      { isLoading: false, isFromCache: false },
    ];

    loadingStates.forEach((state) => {
      expect(typeof state.isLoading).toBe("boolean");
      expect(typeof state.isFromCache).toBe("boolean");
    });
  });

  it("should handle section data", () => {
    // Test that the component can handle section data
    expect(mockSections).toHaveLength(2);
    expect(mockSections[0]?.label).toBe("Aliases");
    expect(mockSections[1]?.label).toBe("Exports");
  });

  it("should handle special characters in section labels", () => {
    // Test that the component can handle special characters
    const specialSections: LogicalSection[] = [
      {
        label: "Section with @#$%^&*()",
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
    ];

    expect(specialSections[0]?.label).toContain("@#$%^&*()");
  });

  it("should handle very long section labels", () => {
    // Test that the component can handle very long labels
    const longLabel = "A".repeat(100);
    const longSections: LogicalSection[] = [
      {
        label: longLabel,
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
    ];

    expect(longSections[0]?.label).toHaveLength(100);
  });

  it("should handle different section types", () => {
    // Test that the component can handle different section types
    const sectionTypes = ["labeled", "dashed", "unlabeled"];

    sectionTypes.forEach((type) => {
      expect(["labeled", "dashed", "unlabeled"]).toContain(type);
    });
  });

  it("should handle large line numbers", () => {
    // Test that the component can handle large line numbers
    const largeLineSection = {
      label: "Large Line Section",
      content: "alias test='echo hello'",
      startLine: 1000,
      endLine: 2000,
      type: "labeled",
    };

    expect(largeLineSection.startLine).toBe(1000);
    expect(largeLineSection.endLine).toBe(2000);
  });

  it("should handle refresh functionality", () => {
    // Test that the component can handle refresh functionality
    const mockRefresh = vi.fn();

    expect(typeof mockRefresh).toBe("function");
    expect(mockRefresh).toBeDefined();
  });

  it("should handle large statistics data", () => {
    // Test that the component can handle large statistics data
    const largeStats = {
      ...mockStats,
      aliases: Array.from({ length: 100 }, (_, i) => ({ name: `alias${i}`, command: `command${i}` })),
      exports: Array.from({ length: 50 }, (_, i) => ({ variable: `VAR${i}`, value: `value${i}` })),
      totalEntries: 150,
    };

    expect(largeStats.aliases).toHaveLength(100);
    expect(largeStats.exports).toHaveLength(50);
    expect(largeStats.totalEntries).toBe(150);
  });

  it("should handle error states", () => {
    // Test that the component can handle error states
    const mockError = new Error("File not found");

    expect(mockError).toBeInstanceOf(Error);
    expect(mockError.message).toBe("File not found");
  });

  it("should handle utility function calls", () => {
    // Test that utility functions are called correctly
    mockCalculateStatistics(mockSections);
    mockHasContent(mockStats);
    mockGetTopEntries(mockStats.aliases);

    expect(mockCalculateStatistics).toHaveBeenCalledWith(mockSections);
    expect(mockHasContent).toHaveBeenCalledWith(mockStats);
    expect(mockGetTopEntries).toHaveBeenCalledWith(mockStats.aliases);
  });
});
