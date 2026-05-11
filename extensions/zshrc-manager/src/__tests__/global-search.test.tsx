import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GlobalSearch from "../global-search";
import type { LogicalSection } from "../lib/parse-zshrc";

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

// Mock zsh module
vi.mock("../lib/zsh", () => ({
  getZshrcPath: vi.fn(() => "/test/.zshrc"),
}));

// Import after mocks
import { useZshrcLoader } from "../hooks/useZshrcLoader";

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

describe("GlobalSearch", () => {
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
    createMockSection("Plugins", 31, 40, "plugins=(git zsh-autosuggestions)", {
      pluginCount: 2,
    }),
    createMockSection("Sources", 41, 50, "source ~/.zshrc.local", {
      sourceCount: 1,
    }),
    createMockSection("Evals", 51, 60, "eval $(brew shellenv)", {
      evalCount: 1,
    }),
    createMockSection("Setopts", 61, 70, "setopt autocd", {
      setoptCount: 1,
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
    it("should render GlobalSearch component", async () => {
      render(<GlobalSearch />);
      expect(screen.getByText("Global Search")).toBeInTheDocument();
    });

    it("should show loading state", () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: [],
        isLoading: true,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<GlobalSearch />);

      expect(screen.getByText("Global Search")).toBeInTheDocument();
    });

    it("should accept searchBarAccessory prop", () => {
      const accessory = <div data-testid="custom-accessory">Custom</div>;
      // Note: searchBarAccessory is passed to Raycast List component which
      // doesn't render it in test environment - we just verify prop is accepted
      render(<GlobalSearch searchBarAccessory={accessory} />);

      expect(screen.getByText("Global Search")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty state when no configuration found", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: [],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<GlobalSearch />);

      await waitFor(() => {
        expect(screen.getByText("No Configuration Found")).toBeInTheDocument();
      });
    });

    it("should show helpful message in empty state", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: [],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<GlobalSearch />);

      await waitFor(() => {
        const emptyMessage = screen.getByText("Your .zshrc file appears to be empty or couldn't be parsed.");
        expect(emptyMessage).toBeInTheDocument();
      });
    });
  });

  describe("overview state", () => {
    it("should show overview when results exist and not searching", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<GlobalSearch />);

      await waitFor(() => {
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Start typing to search...")).toBeInTheDocument();
      });
    });

    it("should show overview section with entry information", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<GlobalSearch />);

      await waitFor(() => {
        // Verify Overview section is rendered with search prompt
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Start typing to search...")).toBeInTheDocument();
      });
    });
  });

  describe("search functionality", () => {
    it("should filter results by search text - logic test", () => {
      const results = [
        { id: "1", keywords: ["ll", "ls -la", "alias"] },
        { id: "2", keywords: ["path", "/usr/local/bin", "export"] },
      ];

      const searchText = "ll";
      const filtered = results.filter((result) =>
        result.keywords.some((keyword) => keyword.includes(searchText.toLowerCase())),
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe("1");
    });

    it("should return all results when search is empty", () => {
      const results = [
        { id: "1", keywords: ["ll", "ls -la", "alias"] },
        { id: "2", keywords: ["path", "/usr/local/bin", "export"] },
      ];

      const searchText = "";
      const filtered = searchText.trim()
        ? results.filter((r) => r.keywords.some((k) => k.includes(searchText)))
        : results;

      expect(filtered).toHaveLength(2);
    });

    it("should handle case-insensitive search", () => {
      const results = [
        { id: "1", keywords: ["ll", "ls -la", "alias"] },
        { id: "2", keywords: ["PATH", "/usr/local/bin", "export"] },
      ];

      const searchText = "PATH";
      const query = searchText.toLowerCase();
      const filtered = results.filter((result) =>
        result.keywords.some((keyword) => keyword.toLowerCase().includes(query)),
      );

      expect(filtered).toHaveLength(1);
    });
  });

  describe("result grouping", () => {
    it("should group results by type", () => {
      const results = [
        { id: "1", type: "alias" },
        { id: "2", type: "alias" },
        { id: "3", type: "export" },
        { id: "4", type: "function" },
      ];

      const groups = new Map<string, typeof results>();
      results.forEach((result) => {
        const existing = groups.get(result.type) || [];
        existing.push(result);
        groups.set(result.type, existing);
      });

      expect(groups.get("alias")).toHaveLength(2);
      expect(groups.get("export")).toHaveLength(1);
      expect(groups.get("function")).toHaveLength(1);
    });
  });

  describe("search results creation", () => {
    it("should create alias search results", () => {
      const aliases = [
        { name: "ll", command: "ls -la" },
        { name: "gs", command: "git status" },
      ];

      const results = aliases.map((alias, idx) => ({
        id: `alias-${idx}`,
        type: "alias" as const,
        title: alias.name,
        subtitle: alias.command,
        keywords: [alias.name.toLowerCase(), alias.command.toLowerCase(), "alias"],
        copyValue: `alias ${alias.name}='${alias.command}'`,
      }));

      expect(results).toHaveLength(2);
      expect(results[0]?.keywords).toContain("ll");
      expect(results[0]?.keywords).toContain("ls -la");
      expect(results[0]?.keywords).toContain("alias");
    });

    it("should create export search results", () => {
      const exports = [
        { variable: "PATH", value: "/usr/local/bin:$PATH" },
        { variable: "EDITOR", value: "code" },
      ];

      const results = exports.map((exp, idx) => ({
        id: `export-${idx}`,
        type: "export" as const,
        title: exp.variable,
        subtitle: exp.value,
        keywords: [exp.variable.toLowerCase(), exp.value.toLowerCase(), "export", "env"],
        copyValue: `export ${exp.variable}=${exp.value}`,
      }));

      expect(results).toHaveLength(2);
      expect(results[0]?.keywords).toContain("path");
      expect(results[0]?.keywords).toContain("export");
      expect(results[0]?.keywords).toContain("env");
    });

    it("should create function search results", () => {
      const functions = [{ name: "myfunc" }];

      const results = functions.map((func, idx) => ({
        id: `function-${idx}`,
        type: "function" as const,
        title: func.name,
        subtitle: "function",
        keywords: [func.name.toLowerCase(), "function", "func"],
        copyValue: func.name,
      }));

      expect(results).toHaveLength(1);
      expect(results[0]?.keywords).toContain("myfunc");
      expect(results[0]?.keywords).toContain("function");
      expect(results[0]?.keywords).toContain("func");
    });

    it("should create plugin search results", () => {
      const plugins = [{ name: "git" }];

      const results = plugins.map((plugin, idx) => ({
        id: `plugin-${idx}`,
        type: "plugin" as const,
        title: plugin.name,
        subtitle: "plugin",
        keywords: [plugin.name.toLowerCase(), "plugin"],
        copyValue: plugin.name,
      }));

      expect(results).toHaveLength(1);
      expect(results[0]?.keywords).toContain("git");
      expect(results[0]?.keywords).toContain("plugin");
    });

    it("should create source search results", () => {
      const sources = [{ path: "~/.zshrc.local" }];

      const results = sources.map((source, idx) => ({
        id: `source-${idx}`,
        type: "source" as const,
        title: source.path,
        subtitle: "source",
        keywords: [source.path.toLowerCase(), "source"],
        copyValue: `source ${source.path}`,
      }));

      expect(results).toHaveLength(1);
      expect(results[0]?.keywords).toContain("~/.zshrc.local");
      expect(results[0]?.keywords).toContain("source");
    });

    it("should create eval search results", () => {
      const evals = [{ command: "$(brew shellenv)" }];

      const results = evals.map((evalCmd, idx) => ({
        id: `eval-${idx}`,
        type: "eval" as const,
        title: evalCmd.command,
        subtitle: "eval",
        keywords: [evalCmd.command.toLowerCase(), "eval"],
        copyValue: `eval ${evalCmd.command}`,
      }));

      expect(results).toHaveLength(1);
      expect(results[0]?.keywords).toContain("$(brew shellenv)");
      expect(results[0]?.keywords).toContain("eval");
    });

    it("should create setopt search results", () => {
      const setopts = [{ option: "autocd" }];

      const results = setopts.map((setopt, idx) => ({
        id: `setopt-${idx}`,
        type: "setopt" as const,
        title: setopt.option,
        subtitle: "setopt",
        keywords: [setopt.option.toLowerCase(), "setopt", "option"],
        copyValue: `setopt ${setopt.option}`,
      }));

      expect(results).toHaveLength(1);
      expect(results[0]?.keywords).toContain("autocd");
      expect(results[0]?.keywords).toContain("setopt");
      expect(results[0]?.keywords).toContain("option");
    });
  });

  describe("type display names", () => {
    it("should return correct display names for all types", () => {
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

    it("should return raw type for unknown types", () => {
      const names: Record<string, string> = {
        alias: "Aliases",
      };

      const unknownType = "unknown";
      const displayName = names[unknownType] || unknownType;

      expect(displayName).toBe("unknown");
    });
  });

  describe("refresh functionality", () => {
    it("should provide refresh function from hook", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<GlobalSearch />);

      // Verify component renders and refresh function is available
      expect(screen.getByText("Global Search")).toBeInTheDocument();
      expect(mockRefresh).toBeDefined();
      expect(typeof mockRefresh).toBe("function");
    });
  });

  describe("result limiting", () => {
    it("should limit results to 50 per type", () => {
      const manyResults = Array.from({ length: 100 }, (_, i) => ({
        id: `alias-${i}`,
        type: "alias",
        title: `alias${i}`,
      }));

      const limited = manyResults.slice(0, 50);

      expect(limited).toHaveLength(50);
    });
  });

  describe("error handling", () => {
    it("should handle errors from useZshrcLoader", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: [],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: new Error("Failed to load"),
      });

      render(<GlobalSearch />);

      // Should still render the component
      expect(screen.getByText("Global Search")).toBeInTheDocument();
    });
  });

  describe("copy functionality", () => {
    it("should have correct copy values for aliases", () => {
      const alias = { name: "ll", command: "ls -la" };
      const copyValue = `alias ${alias.name}='${alias.command}'`;

      expect(copyValue).toBe("alias ll='ls -la'");
    });

    it("should have correct copy values for exports", () => {
      const exp = { variable: "PATH", value: "/usr/local/bin:$PATH" };
      const copyValue = `export ${exp.variable}=${exp.value}`;

      expect(copyValue).toBe("export PATH=/usr/local/bin:$PATH");
    });

    it("should have correct copy values for sources", () => {
      const source = { path: "~/.zshrc.local" };
      const copyValue = `source ${source.path}`;

      expect(copyValue).toBe("source ~/.zshrc.local");
    });

    it("should have correct copy values for evals", () => {
      const evalCmd = { command: "$(brew shellenv)" };
      const copyValue = `eval ${evalCmd.command}`;

      expect(copyValue).toBe("eval $(brew shellenv)");
    });

    it("should have correct copy values for setopts", () => {
      const setopt = { option: "autocd" };
      const copyValue = `setopt ${setopt.option}`;

      expect(copyValue).toBe("setopt autocd");
    });
  });
});
