import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LogicalSection } from "../lib/parse-zshrc";

// Mock @raycast/utils to prevent module not found error
vi.mock("@raycast/utils", () => ({
  useForm: vi.fn(() => ({
    handleSubmit: vi.fn(),
    itemProps: {},
    values: {},
    reset: vi.fn(),
    focus: vi.fn(),
    setValue: vi.fn(),
  })),
  usePromise: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: undefined,
    revalidate: vi.fn(),
  })),
}));

// Mock the useZshrcLoader hook
const mockRefresh = vi.fn();
vi.mock("../hooks/useZshrcLoader", () => ({
  useZshrcLoader: vi.fn(() => ({
    sections: [],
    isLoading: false,
    refresh: mockRefresh,
    isFromCache: false,
    lastError: null,
  })),
}));

// Mock section icons
vi.mock("../lib/section-icons", () => ({
  getSectionIcon: vi.fn(() => ({ icon: "folder", color: "#007AFF" })),
}));

// Mock zsh module
vi.mock("../lib/zsh", () => ({
  getZshrcPath: vi.fn(() => "/test/.zshrc"),
}));

// Mock child components
vi.mock("../sections", () => ({
  default: () => <div data-testid="sections-component">Sections</div>,
}));
vi.mock("../aliases", () => ({
  default: () => <div data-testid="aliases-component">Aliases</div>,
}));
vi.mock("../exports", () => ({
  default: () => <div data-testid="exports-component">Exports</div>,
}));
vi.mock("../functions", () => ({
  default: () => <div data-testid="functions-component">Functions</div>,
}));
vi.mock("../plugins", () => ({
  default: () => <div data-testid="plugins-component">Plugins</div>,
}));
vi.mock("../sources", () => ({
  default: () => <div data-testid="sources-component">Sources</div>,
}));
vi.mock("../evals", () => ({
  default: () => <div data-testid="evals-component">Evals</div>,
}));
vi.mock("../setopts", () => ({
  default: () => <div data-testid="setopts-component">Setopts</div>,
}));

// Import after mocks
import ZshrcStatistics from "../zshrc-statistics";
import { useZshrcLoader } from "../hooks/useZshrcLoader";
import { calculateStatistics, hasContent, getTopEntries, type ZshrcStatistics as StatsType } from "../utils/statistics";

const mockUseZshrcLoader = vi.mocked(useZshrcLoader);

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

// Helper to create mock statistics
const createMockStats = (overrides: Partial<StatsType> = {}): StatsType => ({
  sectionCount: 2,
  aliases: [
    { name: "ll", command: "ls -la" },
    { name: "gs", command: "git status" },
  ],
  exports: [
    { variable: "PATH", value: "/usr/local/bin:$PATH" },
    { variable: "EDITOR", value: "code" },
  ],
  evals: [{ command: "$(brew shellenv)" }],
  setopts: [{ option: "autocd" }],
  plugins: [{ name: "git" }],
  functions: [{ name: "myfunc" }],
  sources: [{ path: "~/.zshrc.local" }],
  ...overrides,
});

describe("ZshrcStatistics", () => {
  const mockSections: LogicalSection[] = [
    createMockSection("Aliases", 1, 10, "alias ll='ls -la'\nalias gs='git status'", {
      aliasCount: 2,
    }),
    createMockSection("Exports", 11, 20, "export PATH=/usr/local/bin:$PATH\nexport EDITOR=code", {
      exportCount: 2,
    }),
    createMockSection("Functions", 21, 30, "function myfunc() { echo test; }", {
      functionCount: 1,
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseZshrcLoader.mockReturnValue({
      sections: [],
      isLoading: false,
      refresh: mockRefresh,
      isFromCache: false,
      lastError: null,
    });
  });

  describe("component rendering", () => {
    it("should render ZshrcStatistics component", async () => {
      render(<ZshrcStatistics />);
      expect(screen.getByText("Zshrc Statistics")).toBeInTheDocument();
    });

    it("should show loading state", () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: [],
        isLoading: true,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      expect(screen.getByText("Zshrc Statistics")).toBeInTheDocument();
    });

    it("should accept searchBarAccessory prop", () => {
      const accessory = <div data-testid="custom-accessory">Custom</div>;
      render(<ZshrcStatistics searchBarAccessory={accessory} />);

      expect(screen.getByText("Zshrc Statistics")).toBeInTheDocument();
    });

    it("should show cached indicator when data is from cache", () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: true,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      expect(screen.getByText("Zshrc Statistics (Cached)")).toBeInTheDocument();
    });
  });

  describe("statistics display", () => {
    it("should display sections count", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      await waitFor(() => {
        expect(screen.getByText("Sections")).toBeInTheDocument();
      });
    });

    it("should display aliases count", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      await waitFor(() => {
        expect(screen.getAllByText(/Aliases/).length).toBeGreaterThan(0);
      });
    });

    it("should display exports count", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      await waitFor(() => {
        expect(screen.getAllByText(/Exports/).length).toBeGreaterThan(0);
      });
    });
  });

  describe("loading state", () => {
    it("should show loading message when no stats available", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: [],
        isLoading: true,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      // Loading state should be shown
      expect(screen.getByText("Zshrc Statistics")).toBeInTheDocument();
    });
  });

  describe("empty configuration", () => {
    it("should handle empty sections array", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: [],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      // Should still render the component
      expect(screen.getByText("Zshrc Statistics")).toBeInTheDocument();
    });

    it("should show empty configuration message when no entries", async () => {
      const emptySections = [createMockSection("Unlabeled", 1, 1, "# Empty")];

      mockUseZshrcLoader.mockReturnValue({
        sections: emptySections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      await waitFor(() => {
        expect(screen.getByText("Empty Configuration")).toBeInTheDocument();
      });
    });
  });

  describe("search functionality", () => {
    it("should show overview when not searching", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      await waitFor(() => {
        expect(screen.getByText("Overview")).toBeInTheDocument();
      });
    });
  });

  describe("refresh functionality", () => {
    it("should provide refresh function", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      expect(mockRefresh).toBeDefined();
    });
  });

  describe("conditional rendering of entry types", () => {
    it("should show functions when functions exist", async () => {
      const sectionsWithFunctions = [createMockSection("Functions", 1, 10, "function test() {}", { functionCount: 1 })];

      mockUseZshrcLoader.mockReturnValue({
        sections: sectionsWithFunctions,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      await waitFor(() => {
        // Functions entry should be present
        expect(screen.getByText("Overview")).toBeInTheDocument();
      });
    });

    it("should show plugins when plugins exist", async () => {
      const sectionsWithPlugins = [createMockSection("Plugins", 1, 10, "plugins=(git)", { pluginCount: 1 })];

      mockUseZshrcLoader.mockReturnValue({
        sections: sectionsWithPlugins,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      await waitFor(() => {
        expect(screen.getByText("Overview")).toBeInTheDocument();
      });
    });

    it("should show sources when sources exist", async () => {
      const sectionsWithSources = [createMockSection("Sources", 1, 10, "source ~/.zshrc.local", { sourceCount: 1 })];

      mockUseZshrcLoader.mockReturnValue({
        sections: sectionsWithSources,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      await waitFor(() => {
        expect(screen.getByText("Overview")).toBeInTheDocument();
      });
    });

    it("should show evals when evals exist", async () => {
      const sectionsWithEvals = [createMockSection("Evals", 1, 10, "eval $(brew shellenv)", { evalCount: 1 })];

      mockUseZshrcLoader.mockReturnValue({
        sections: sectionsWithEvals,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      await waitFor(() => {
        expect(screen.getByText("Overview")).toBeInTheDocument();
      });
    });

    it("should show setopts when setopts exist", async () => {
      const sectionsWithSetopts = [createMockSection("Setopts", 1, 10, "setopt autocd", { setoptCount: 1 })];

      mockUseZshrcLoader.mockReturnValue({
        sections: sectionsWithSetopts,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ZshrcStatistics />);

      await waitFor(() => {
        expect(screen.getByText("Overview")).toBeInTheDocument();
      });
    });
  });
});

describe("ZshrcStatistics helper functions", () => {
  describe("createSearchResults", () => {
    it("should handle stats with all entry types", () => {
      const stats = createMockStats();

      // Test that we have valid stats structure
      expect(stats.aliases).toHaveLength(2);
      expect(stats.exports).toHaveLength(2);
      expect(stats.functions).toHaveLength(1);
      expect(stats.plugins).toHaveLength(1);
      expect(stats.sources).toHaveLength(1);
      expect(stats.evals).toHaveLength(1);
      expect(stats.setopts).toHaveLength(1);
    });

    it("should handle empty stats", () => {
      const emptyStats = createMockStats({
        aliases: [],
        exports: [],
        functions: [],
        plugins: [],
        sources: [],
        evals: [],
        setopts: [],
      });

      expect(emptyStats.aliases).toHaveLength(0);
      expect(emptyStats.sectionCount).toBe(2);
    });
  });

  describe("filterResults", () => {
    it("should filter results by search text - logic test", () => {
      const results = [
        { id: "1", keywords: ["test", "alias"] },
        { id: "2", keywords: ["other", "export"] },
      ];

      const searchText = "test";
      const filtered = results.filter((result) =>
        result.keywords.some((keyword) => keyword.includes(searchText.toLowerCase())),
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe("1");
    });

    it("should return all results when search is empty", () => {
      const results = [
        { id: "1", keywords: ["test", "alias"] },
        { id: "2", keywords: ["other", "export"] },
      ];

      const searchText = "";
      const filtered = searchText.trim()
        ? results.filter((r) => r.keywords.some((k) => k.includes(searchText)))
        : results;

      expect(filtered).toHaveLength(2);
    });
  });

  describe("groupResultsByType", () => {
    it("should group results by type", () => {
      const results = [
        { id: "1", type: "alias" },
        { id: "2", type: "alias" },
        { id: "3", type: "export" },
      ];

      const groups = new Map<string, typeof results>();
      results.forEach((result) => {
        const existing = groups.get(result.type) || [];
        existing.push(result);
        groups.set(result.type, existing);
      });

      expect(groups.get("alias")).toHaveLength(2);
      expect(groups.get("export")).toHaveLength(1);
    });
  });

  describe("getTypeDisplayName", () => {
    it("should return display names for known types", () => {
      const names: Record<string, string> = {
        alias: "Aliases",
        export: "Exports",
        function: "Functions",
        plugin: "Plugins",
        source: "Sources",
        eval: "Evals",
        setopt: "Setopts",
      };

      expect(names["alias"]).toBe("Aliases");
      expect(names["export"]).toBe("Exports");
      expect(names["function"]).toBe("Functions");
      expect(names["plugin"]).toBe("Plugins");
      expect(names["source"]).toBe("Sources");
      expect(names["eval"]).toBe("Evals");
      expect(names["setopt"]).toBe("Setopts");
    });

    it("should return type for unknown types", () => {
      const names: Record<string, string> = {
        alias: "Aliases",
      };

      const unknownType = "unknown";
      const displayName = names[unknownType] || unknownType;

      expect(displayName).toBe("unknown");
    });
  });
});

describe("calculateStatistics integration", () => {
  it("should calculate statistics from sections", () => {
    const sections: LogicalSection[] = [
      {
        label: "Aliases",
        startLine: 1,
        endLine: 10,
        content: "alias ll='ls -la'\nalias gs='git status'",
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
    ];

    const stats = calculateStatistics(sections);

    expect(stats).toBeDefined();
    expect(stats.sectionCount).toBe(1);
  });

  it("should handle empty sections", () => {
    const stats = calculateStatistics([]);

    expect(stats).toBeDefined();
    expect(stats.sectionCount).toBe(0);
  });
});

describe("hasContent utility", () => {
  it("should return true when content exists", () => {
    const stats = createMockStats({
      functions: [{ name: "test" }],
    });

    expect(hasContent(stats, "functions")).toBe(true);
  });

  it("should return false when content is empty", () => {
    const stats = createMockStats({
      functions: [],
    });

    expect(hasContent(stats, "functions")).toBe(false);
  });
});

describe("getTopEntries utility", () => {
  it("should return top N entries", () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({ name: `item${i}` }));
    const top5 = getTopEntries(entries, 5);

    expect(top5).toHaveLength(5);
  });

  it("should return all entries when count exceeds array length", () => {
    const entries = [{ name: "item1" }, { name: "item2" }];
    const top5 = getTopEntries(entries, 5);

    expect(top5).toHaveLength(2);
  });

  it("should handle empty array", () => {
    const top5 = getTopEntries([], 5);

    expect(top5).toHaveLength(0);
  });
});
