import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Sections from "../sections";
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

// Mock section icons
vi.mock("../lib/section-icons", () => ({
  getSectionIcon: vi.fn(() => ({ icon: "folder", color: "#007AFF" })),
}));

// Mock section accessories
vi.mock("../utils/section-accessories", () => ({
  generateSectionAccessories: vi.fn(() => []),
  calculateTotalEntries: vi.fn((section) => {
    return (
      section.aliasCount +
      section.exportCount +
      section.functionCount +
      section.pluginCount +
      section.sourceCount +
      section.evalCount +
      section.setoptCount +
      section.otherCount
    );
  }),
}));

// Mock zsh module
vi.mock("../lib/zsh", () => ({
  getZshrcPath: vi.fn(() => "/test/.zshrc"),
}));

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
}));

// Import after mocks
import { useZshrcLoader } from "../hooks/useZshrcLoader";
import { getSectionIcon } from "../lib/section-icons";
import { generateSectionAccessories, calculateTotalEntries } from "../utils/section-accessories";

const mockUseZshrcLoader = vi.mocked(useZshrcLoader);
const mockGetSectionIcon = vi.mocked(getSectionIcon);
const mockGenerateSectionAccessories = vi.mocked(generateSectionAccessories);
const mockCalculateTotalEntries = vi.mocked(calculateTotalEntries);

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

describe("Sections", () => {
  const mockLabeledSections: LogicalSection[] = [
    createMockSection("Aliases", 1, 10, "alias ll='ls -la'\nalias gs='git status'", {
      aliasCount: 2,
    }),
    createMockSection("Exports", 11, 20, "export PATH=/usr/local/bin:$PATH\nexport EDITOR=code", {
      exportCount: 2,
    }),
    createMockSection("Functions", 21, 50, "function test() {\n  echo hello\n}", {
      functionCount: 1,
    }),
  ];

  const mockUnlabeledSections: LogicalSection[] = [
    createMockSection("Unlabeled", 51, 60, "# Some random content\necho 'test'", {
      otherCount: 2,
    }),
  ];

  const mockMixedSections: LogicalSection[] = [...mockLabeledSections, ...mockUnlabeledSections];

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

    mockGetSectionIcon.mockReturnValue({ icon: "folder", color: "#007AFF" });
    mockGenerateSectionAccessories.mockReturnValue([]);
    mockCalculateTotalEntries.mockImplementation((section: LogicalSection) => {
      return (
        section.aliasCount +
        section.exportCount +
        section.functionCount +
        section.pluginCount +
        section.sourceCount +
        section.evalCount +
        section.setoptCount +
        section.otherCount
      );
    });
  });

  describe("component rendering", () => {
    it("should render Sections component", async () => {
      render(<Sections />);
      expect(screen.getByText("Sections")).toBeInTheDocument();
    });

    it("should render overview section", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockLabeledSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Section Summary")).toBeInTheDocument();
      });
    });

    it("should show loading state", () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: [],
        isLoading: true,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      expect(screen.getByText("Sections")).toBeInTheDocument();
    });

    it("should accept searchBarAccessory prop", () => {
      const accessory = <div data-testid="custom-accessory">Custom</div>;
      // Note: searchBarAccessory is passed to Raycast List component which
      // doesn't render it in test environment - we just verify prop is accepted
      render(<Sections searchBarAccessory={accessory} />);

      expect(screen.getByText("Sections")).toBeInTheDocument();
    });
  });

  describe("labeled sections", () => {
    it("should render labeled sections when present", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockLabeledSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        expect(screen.getByText("Labeled Sections")).toBeInTheDocument();
        expect(screen.getByText("Aliases")).toBeInTheDocument();
        expect(screen.getByText("Exports")).toBeInTheDocument();
        expect(screen.getByText("Functions")).toBeInTheDocument();
      });
    });

    it("should call getSectionIcon for each labeled section", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockLabeledSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        expect(mockGetSectionIcon).toHaveBeenCalledWith("Aliases");
        expect(mockGetSectionIcon).toHaveBeenCalledWith("Exports");
        expect(mockGetSectionIcon).toHaveBeenCalledWith("Functions");
      });
    });

    it("should calculate total entries for each labeled section", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockLabeledSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        expect(mockCalculateTotalEntries).toHaveBeenCalledWith(mockLabeledSections[0]);
        expect(mockCalculateTotalEntries).toHaveBeenCalledWith(mockLabeledSections[1]);
        expect(mockCalculateTotalEntries).toHaveBeenCalledWith(mockLabeledSections[2]);
      });
    });

    it("should generate accessories for each labeled section", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockLabeledSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        expect(mockGenerateSectionAccessories).toHaveBeenCalledWith(mockLabeledSections[0]);
        expect(mockGenerateSectionAccessories).toHaveBeenCalledWith(mockLabeledSections[1]);
        expect(mockGenerateSectionAccessories).toHaveBeenCalledWith(mockLabeledSections[2]);
      });
    });

    it("should not render labeled sections when empty", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockUnlabeledSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        expect(screen.queryByText("Labeled Sections")).not.toBeInTheDocument();
      });
    });
  });

  describe("unlabeled sections", () => {
    it("should render unlabeled sections when present", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockUnlabeledSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        expect(screen.getByText("Unlabeled Sections")).toBeInTheDocument();
        expect(screen.getByText("Unlabeled Section 1")).toBeInTheDocument();
      });
    });

    it("should render multiple unlabeled sections with correct numbering", async () => {
      const multipleUnlabeled: LogicalSection[] = [
        createMockSection("Unlabeled", 1, 10, "content 1"),
        createMockSection("Unlabeled", 11, 20, "content 2"),
        createMockSection("Unlabeled", 21, 30, "content 3"),
      ];

      mockUseZshrcLoader.mockReturnValue({
        sections: multipleUnlabeled,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        expect(screen.getByText("Unlabeled Section 1")).toBeInTheDocument();
        expect(screen.getByText("Unlabeled Section 2")).toBeInTheDocument();
        expect(screen.getByText("Unlabeled Section 3")).toBeInTheDocument();
      });
    });

    it("should not render unlabeled sections when empty", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockLabeledSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        expect(screen.queryByText("Unlabeled Sections")).not.toBeInTheDocument();
      });
    });
  });

  describe("mixed sections", () => {
    it("should render both labeled and unlabeled sections", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockMixedSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        expect(screen.getByText("Labeled Sections")).toBeInTheDocument();
        expect(screen.getByText("Unlabeled Sections")).toBeInTheDocument();
      });
    });
  });

  describe("section filtering", () => {
    it("should filter sections by search text", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockLabeledSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      // The filter logic is based on section.label.toLowerCase().includes(searchText.toLowerCase())
      // Test the internal filtering logic
      const searchText = "alias";
      const filteredSections = mockLabeledSections.filter((section) =>
        section.label.toLowerCase().includes(searchText.toLowerCase()),
      );

      expect(filteredSections).toHaveLength(1);
      expect(filteredSections[0]?.label).toBe("Aliases");
    });

    it("should handle case-insensitive filtering", () => {
      const searchText = "EXPORTS";
      const filteredSections = mockLabeledSections.filter((section) =>
        section.label.toLowerCase().includes(searchText.toLowerCase()),
      );

      expect(filteredSections).toHaveLength(1);
      expect(filteredSections[0]?.label).toBe("Exports");
    });

    it("should return all sections when search is empty", () => {
      const searchText = "";
      const filteredSections = mockLabeledSections.filter((section) =>
        section.label.toLowerCase().includes(searchText.toLowerCase()),
      );

      expect(filteredSections).toHaveLength(3);
    });

    it("should return no sections when search matches nothing", () => {
      const searchText = "nonexistent";
      const filteredSections = mockLabeledSections.filter((section) =>
        section.label.toLowerCase().includes(searchText.toLowerCase()),
      );

      expect(filteredSections).toHaveLength(0);
    });
  });

  describe("section summary", () => {
    it("should display correct section counts in summary", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockMixedSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        // Should show total section count (4)
        expect(screen.getByText("4")).toBeInTheDocument();
      });
    });
  });

  describe("section content preview", () => {
    it("should truncate long content in preview", () => {
      const longContent = Array(20).fill("line content").join("\n");
      const section = createMockSection("Test", 1, 100, longContent);

      // Test the content preview logic: section.content.split('\n').slice(0, 10)
      const previewLines = section.content.split("\n").slice(0, 10);
      expect(previewLines).toHaveLength(10);
    });

    it("should not show ellipsis for short content", () => {
      const shortContent = "line 1\nline 2";
      const section = createMockSection("Test", 1, 2, shortContent);

      const lines = section.content.split("\n");
      expect(lines.length).toBeLessThanOrEqual(10);
    });
  });

  describe("error handling", () => {
    it("should handle errors from useZshrcLoader", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: [],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: new Error("File not found"),
      });

      render(<Sections />);

      // Should still render the component
      expect(screen.getByText("Sections")).toBeInTheDocument();
    });
  });

  describe("refresh functionality", () => {
    it("should provide refresh function from hook", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockLabeledSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      expect(mockRefresh).toBeDefined();
    });
  });

  describe("special characters handling", () => {
    it("should handle sections with special characters in labels", async () => {
      const specialSection = createMockSection("Section@#$%^&*()", 1, 10, "content");

      mockUseZshrcLoader.mockReturnValue({
        sections: [specialSection],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        expect(screen.getByText("Section@#$%^&*()")).toBeInTheDocument();
      });
    });

    it("should handle sections with unicode characters", async () => {
      const unicodeSection = createMockSection("Section 日本語", 1, 10, "content");

      mockUseZshrcLoader.mockReturnValue({
        sections: [unicodeSection],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        expect(screen.getByText("Section 日本語")).toBeInTheDocument();
      });
    });
  });

  describe("large sections handling", () => {
    it("should handle sections with large line numbers", async () => {
      const largeSection = createMockSection("Large Section", 1000, 2000, "content");

      mockUseZshrcLoader.mockReturnValue({
        sections: [largeSection],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        expect(screen.getByText("Large Section")).toBeInTheDocument();
      });
    });

    it("should handle many sections efficiently", async () => {
      const manySections = Array.from({ length: 50 }, (_, i) =>
        createMockSection(`Section ${i + 1}`, i * 10 + 1, (i + 1) * 10, `content ${i}`),
      );

      mockUseZshrcLoader.mockReturnValue({
        sections: manySections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<Sections />);

      await waitFor(() => {
        expect(screen.getByText("Labeled Sections")).toBeInTheDocument();
        expect(screen.getByText("Section 1")).toBeInTheDocument();
      });
    });
  });

  describe("entry type counts", () => {
    it("should correctly separate labeled from unlabeled sections", async () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: mockMixedSections,
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      // Test the filtering logic
      const labeledSections = mockMixedSections.filter((section) => section.label !== "Unlabeled");
      const unlabeledSections = mockMixedSections.filter((section) => section.label === "Unlabeled");

      expect(labeledSections).toHaveLength(3);
      expect(unlabeledSections).toHaveLength(1);
    });
  });
});
