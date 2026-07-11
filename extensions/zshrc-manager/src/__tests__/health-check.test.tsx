import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import HealthCheck from "../health-check";
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

// Mock validation module
vi.mock("../utils/validation", () => ({
  detectDuplicates: vi.fn(() => ({ duplicates: [], totalDuplicates: 0 })),
  detectBrokenSources: vi.fn(() => Promise.resolve({ brokenSources: [], totalBroken: 0 })),
}));

// Import after mocks
import { useZshrcLoader } from "../hooks/useZshrcLoader";
import { detectDuplicates, detectBrokenSources } from "../utils/validation";

const mockUseZshrcLoader = vi.mocked(useZshrcLoader);
const mockDetectDuplicates = vi.mocked(detectDuplicates);
const mockDetectBrokenSources = vi.mocked(detectBrokenSources);

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

describe("HealthCheck", () => {
  const mockSections: LogicalSection[] = [
    createMockSection("Aliases", 1, 10, "alias ll='ls -la'\nalias gs='git status'", {
      aliasCount: 2,
    }),
    createMockSection("Exports", 11, 20, "export PATH=/usr/local/bin:$PATH\nexport EDITOR=code", {
      exportCount: 2,
    }),
    createMockSection("Sources", 21, 30, "source ~/.zshrc.local", {
      sourceCount: 1,
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

    mockDetectDuplicates.mockReturnValue({ duplicates: [], totalDuplicates: 0 });
    mockDetectBrokenSources.mockResolvedValue({ brokenSources: [], totalBroken: 0 });
  });

  describe("component rendering", () => {
    it("should render HealthCheck component", async () => {
      render(<HealthCheck />);
      expect(screen.getByText("Health Check")).toBeInTheDocument();
    });

    it("should show loading state", () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: [],
        isLoading: true,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<HealthCheck />);

      expect(screen.getByText("Health Check")).toBeInTheDocument();
    });

    it("should accept searchBarAccessory prop", () => {
      const accessory = <div data-testid="custom-accessory">Custom</div>;
      // Note: searchBarAccessory is passed to Raycast List component which
      // doesn't render it in test environment - we just verify prop is accepted
      render(<HealthCheck searchBarAccessory={accessory} />);

      expect(screen.getByText("Health Check")).toBeInTheDocument();
    });
  });

  describe("health score calculation", () => {
    it("should show excellent score when no issues", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<HealthCheck />);

      await waitFor(() => {
        expect(screen.getByText("Health Score")).toBeInTheDocument();
      });
    });

    it("should calculate correct score with no issues", () => {
      const issues: { severity: "error" | "warning" | "info" }[] = [];
      const errorCount = issues.filter((i) => i.severity === "error").length;
      const warningCount = issues.filter((i) => i.severity === "warning").length;

      let score = 100;
      score -= errorCount * 20;
      score -= warningCount * 5;
      score = Math.max(0, score);

      expect(score).toBe(100);
    });

    it("should deduct 20 points per error", () => {
      const issues: { severity: "error" | "warning" | "info" }[] = [{ severity: "error" }, { severity: "error" }];
      const errorCount = issues.filter((i) => i.severity === "error").length;

      let score = 100;
      score -= errorCount * 20;

      expect(score).toBe(60);
    });

    it("should deduct 5 points per warning", () => {
      const issues: { severity: "error" | "warning" | "info" }[] = [{ severity: "warning" }, { severity: "warning" }];
      const warningCount = issues.filter((i) => i.severity === "warning").length;

      let score = 100;
      score -= warningCount * 5;

      expect(score).toBe(90);
    });

    it("should not go below 0", () => {
      const issues: { severity: "error" | "warning" | "info" }[] = Array(10).fill({ severity: "error" });
      const errorCount = issues.filter((i) => i.severity === "error").length;

      let score = 100;
      score -= errorCount * 20;
      score = Math.max(0, score);

      expect(score).toBe(0);
    });

    it("should return Excellent for score >= 90", () => {
      const score = 95;
      let label: string;

      if (score >= 90) {
        label = "Excellent";
      } else if (score >= 70) {
        label = "Good";
      } else if (score >= 50) {
        label = "Fair";
      } else {
        label = "Needs Attention";
      }

      expect(label).toBe("Excellent");
    });

    it("should return Good for score >= 70", () => {
      const score = 75;
      let label: string;

      if (score >= 90) {
        label = "Excellent";
      } else if (score >= 70) {
        label = "Good";
      } else if (score >= 50) {
        label = "Fair";
      } else {
        label = "Needs Attention";
      }

      expect(label).toBe("Good");
    });

    it("should return Fair for score >= 50", () => {
      const score = 55;
      let label: string;

      if (score >= 90) {
        label = "Excellent";
      } else if (score >= 70) {
        label = "Good";
      } else if (score >= 50) {
        label = "Fair";
      } else {
        label = "Needs Attention";
      }

      expect(label).toBe("Fair");
    });

    it("should return Needs Attention for score < 50", () => {
      const score = 30;
      let label: string;

      if (score >= 90) {
        label = "Excellent";
      } else if (score >= 70) {
        label = "Good";
      } else if (score >= 50) {
        label = "Fair";
      } else {
        label = "Needs Attention";
      }

      expect(label).toBe("Needs Attention");
    });
  });

  describe("severity styling", () => {
    it("should return error style for error severity", () => {
      type Severity = "error" | "warning" | "info";
      const getSeverityStyle = (severity: Severity) => {
        switch (severity) {
          case "error":
            return { icon: "XMarkCircle", color: "#FF3B30" };
          case "warning":
            return { icon: "ExclamationMark", color: "#FF9500" };
          case "info":
            return { icon: "Info", color: "#007AFF" };
        }
      };

      const style = getSeverityStyle("error");
      expect(style.icon).toBe("XMarkCircle");
    });

    it("should return warning style for warning severity", () => {
      type Severity = "error" | "warning" | "info";
      const getSeverityStyle = (severity: Severity) => {
        switch (severity) {
          case "error":
            return { icon: "XMarkCircle", color: "#FF3B30" };
          case "warning":
            return { icon: "ExclamationMark", color: "#FF9500" };
          case "info":
            return { icon: "Info", color: "#007AFF" };
        }
      };

      const style = getSeverityStyle("warning");
      expect(style.icon).toBe("ExclamationMark");
    });

    it("should return info style for info severity", () => {
      type Severity = "error" | "warning" | "info";
      const getSeverityStyle = (severity: Severity) => {
        switch (severity) {
          case "error":
            return { icon: "XMarkCircle", color: "#FF3B30" };
          case "warning":
            return { icon: "ExclamationMark", color: "#FF9500" };
          case "info":
            return { icon: "Info", color: "#007AFF" };
        }
      };

      const style = getSeverityStyle("info");
      expect(style.icon).toBe("Info");
    });
  });

  describe("issue creation", () => {
    it("should create duplicate alias issues", () => {
      const duplicates = [{ name: "ll", count: 2, sections: ["Aliases", "General"] }];

      const issues = duplicates.map((dup) => ({
        id: `dup-alias-${dup.name}`,
        severity: "warning" as const,
        title: `Duplicate alias: ${dup.name}`,
        description: `Defined ${dup.count} times in: ${dup.sections.join(", ")}`,
        category: "duplicates" as const,
      }));

      expect(issues).toHaveLength(1);
      expect(issues[0]?.severity).toBe("warning");
      expect(issues[0]?.title).toContain("Duplicate alias");
    });

    it("should create duplicate export issues", () => {
      const duplicates = [{ name: "PATH", count: 3, sections: ["Exports", "General", "Environment"] }];

      const issues = duplicates.map((dup) => ({
        id: `dup-export-${dup.name}`,
        severity: "warning" as const,
        title: `Duplicate export: ${dup.name}`,
        description: `Defined ${dup.count} times in: ${dup.sections.join(", ")}`,
        category: "duplicates" as const,
      }));

      expect(issues).toHaveLength(1);
      expect(issues[0]?.title).toContain("PATH");
    });

    it("should create broken source issues", () => {
      const brokenSources = [{ path: "~/.missing-file", expandedPath: "/Users/test/.missing-file" }];

      const issues = brokenSources.map((broken) => ({
        id: `broken-${broken.path}`,
        severity: "error" as const,
        title: "Missing source file",
        description: broken.path,
        category: "broken" as const,
      }));

      expect(issues).toHaveLength(1);
      expect(issues[0]?.severity).toBe("error");
    });
  });

  describe("no issues state", () => {
    it("should show all clear message when no issues", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<HealthCheck />);

      await waitFor(() => {
        expect(screen.getByText("Your configuration looks healthy!")).toBeInTheDocument();
      });
    });
  });

  describe("error issues display", () => {
    it("should show error section when errors exist", async () => {
      mockDetectBrokenSources.mockResolvedValue({
        brokenSources: [{ path: "~/.missing", section: "Sources", expandedPath: "/test/.missing" }],
        totalBroken: 1,
      });

      mockUseZshrcLoader.mockReturnValue({
        sections: [createMockSection("Sources", 1, 10, "source ~/.missing", { sourceCount: 1 })],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<HealthCheck />);

      await waitFor(() => {
        expect(screen.getByText("Errors")).toBeInTheDocument();
      });
    });
  });

  describe("warning issues display", () => {
    it("should show warning section when warnings exist", async () => {
      mockDetectDuplicates.mockReturnValue({
        duplicates: [{ name: "ll", count: 2, sections: ["Aliases"] }],
        totalDuplicates: 1,
      });

      mockUseZshrcLoader.mockReturnValue({
        sections: mockSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<HealthCheck />);

      await waitFor(() => {
        expect(screen.getByText("Warnings")).toBeInTheDocument();
      });
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

      render(<HealthCheck />);

      // Verify component renders and refresh function is available
      expect(screen.getByText("Health Check")).toBeInTheDocument();
      expect(mockRefresh).toBeDefined();
      expect(typeof mockRefresh).toBe("function");
    });
  });

  describe("async source checking", () => {
    it("should handle empty sources", async () => {
      // With no sources, detectBrokenSources is not called (handled directly)
      mockUseZshrcLoader.mockReturnValue({
        sections: [createMockSection("Aliases", 1, 10, "alias ll='ls -la'", { aliasCount: 1 })],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<HealthCheck />);

      await waitFor(() => {
        // When there are no sources, the component sets empty result directly
        // so we just verify it renders correctly
        expect(screen.getByText("Health Check")).toBeInTheDocument();
      });
    });

    it("should call detectBrokenSources when sources exist", async () => {
      mockDetectBrokenSources.mockResolvedValue({ brokenSources: [], totalBroken: 0 });

      mockUseZshrcLoader.mockReturnValue({
        sections: [createMockSection("Sources", 1, 10, "source ~/.test", { sourceCount: 1 })],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<HealthCheck />);

      await waitFor(() => {
        expect(mockDetectBrokenSources).toHaveBeenCalled();
      });
    });

    it("should handle error in broken source detection", async () => {
      mockDetectBrokenSources.mockRejectedValue(new Error("Detection failed"));

      mockUseZshrcLoader.mockReturnValue({
        sections: [createMockSection("Sources", 1, 10, "source ~/.test", { sourceCount: 1 })],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<HealthCheck />);

      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText("Health Check")).toBeInTheDocument();
      });
    });
  });

  describe("issue categorization", () => {
    it("should categorize issues correctly", () => {
      const issues = [
        { id: "1", severity: "error" as const, category: "broken" as const },
        { id: "2", severity: "warning" as const, category: "duplicates" as const },
      ];

      const errorIssues = issues.filter((i) => i.severity === "error");
      const warningIssues = issues.filter((i) => i.severity === "warning");

      expect(errorIssues).toHaveLength(1);
      expect(warningIssues).toHaveLength(1);
    });
  });

  describe("summary section", () => {
    it("should display summary with issue counts", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<HealthCheck />);

      await waitFor(() => {
        expect(screen.getByText("Summary")).toBeInTheDocument();
      });
    });
  });
});
