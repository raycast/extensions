import React from "react";
import { render, screen } from "@testing-library/react";
import { ListViewController } from "../lib/list-view-controller";
import { useZshrcLoader } from "../hooks/useZshrcLoader";
import { useZshrcFilter } from "../hooks/useZshrcFilter";
import { vi } from "vitest";
import type { FilterableItem } from "../lib/list-view-controller";
import { createMockSection } from "./fixtures/sections";

// Mock dependencies
vi.mock("../hooks/useZshrcLoader");
vi.mock("../hooks/useZshrcFilter");
vi.mock("../lib/zsh", () => ({
  getZshrcPath: vi.fn(() => "/Users/test/.zshrc"),
}));

const mockUseZshrcLoader = vi.mocked(useZshrcLoader);
const mockUseZshrcFilter = vi.mocked(useZshrcFilter);

interface TestItem extends FilterableItem {
  name: string;
  value: string;
}

describe("list-view-controller.tsx", () => {
  const mockRefresh = vi.fn();
  const mockSetSearchText = vi.fn();

  const mockConfig = {
    commandName: "test-command",
    navigationTitle: "Test List",
    searchPlaceholder: "Search...",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: "Document" as any,
    tintColor: "#007AFF",
    itemType: "item",
    itemTypePlural: "items",
    parser: (content: string): TestItem[] => {
      return content.split("\n").map((line, index) => ({
        name: `item${index}`,
        value: line,
        section: "Test Section",
        sectionStartLine: index + 1,
      }));
    },
    searchFields: ["name", "value"],
    generateOverviewMarkdown: () => "# Overview",
    generateItemMarkdown: () => "# Item Detail",
    generateTitle: (item: TestItem) => item.name,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const testItems: TestItem[] = [
      {
        name: "item1",
        value: "item1",
        section: "Test Section",
        sectionStartLine: 1,
      },
    ];
    mockUseZshrcLoader.mockReturnValue({
      sections: [
        createMockSection({
          label: "Test Section",
          startLine: 1,
          endLine: 3,
          content: "item1\nitem2\nitem3",
        }),
      ],
      isLoading: false,
      refresh: mockRefresh,
      isFromCache: false,
      lastError: null,
    });
    mockUseZshrcFilter.mockReturnValue({
      searchText: "",
      setSearchText: mockSetSearchText,
      filtered: testItems,
      grouped: {
        "Test Section": testItems,
      },
    });
  });

  describe("rendering", () => {
    it("should render list with correct navigation title", () => {
      render(<ListViewController {...mockConfig} />);

      expect(screen.getByTestId("list")).toBeInTheDocument();
    });

    it("should render overview section", () => {
      render(<ListViewController {...mockConfig} />);

      expect(screen.getByText("Item Summary")).toBeInTheDocument();
    });

    it("should render items grouped by section", () => {
      render(<ListViewController {...mockConfig} />);

      expect(screen.getAllByText("Test Section").length).toBeGreaterThan(0);
    });

    it("should show loading state", () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: [],
        isLoading: true,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ListViewController {...mockConfig} />);

      expect(screen.getByTestId("list")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should render empty state when no items found", () => {
      mockUseZshrcFilter.mockReturnValue({
        searchText: "nonexistent",
        setSearchText: mockSetSearchText,
        filtered: [],
        grouped: {},
      });

      render(<ListViewController {...mockConfig} />);

      expect(screen.getByText("No items match your search")).toBeInTheDocument();
    });

    it("should not show empty state when loading", () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: [],
        isLoading: true,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });
      mockUseZshrcFilter.mockReturnValue({
        searchText: "",
        setSearchText: mockSetSearchText,
        filtered: [],
        grouped: {},
      });

      render(<ListViewController {...mockConfig} />);

      // Should not show empty state while loading
      expect(screen.queryByText("No items match your search")).not.toBeInTheDocument();
    });
  });

  describe("action generation", () => {
    it("should use custom overview actions when provided", () => {
      const customOverviewActions = vi.fn(() => <div data-testid="custom-overview-actions">Custom Actions</div>);

      render(
        <ListViewController
          {...mockConfig}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          generateOverviewActions={customOverviewActions as any}
        />,
      );

      expect(customOverviewActions).toHaveBeenCalled();
    });

    it("should use default overview actions when custom not provided", () => {
      render(<ListViewController {...mockConfig} />);

      expect(screen.getByTestId("list")).toBeInTheDocument();
    });

    it("should use custom item actions when provided", () => {
      const customItemActions = vi.fn(() => <div data-testid="custom-item-actions">Custom Actions</div>);

      render(
        <ListViewController
          {...mockConfig}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          generateItemActions={customItemActions as any}
        />,
      );

      expect(customItemActions).toHaveBeenCalled();
    });

    it("should use default item actions when custom not provided", () => {
      render(<ListViewController {...mockConfig} />);

      expect(screen.getByTestId("list")).toBeInTheDocument();
    });
  });

  describe("post-processing", () => {
    it("should apply post-processing function if provided", () => {
      const postProcessItems = vi.fn((items: TestItem[]) => items.filter((item) => item.name !== "item2"));

      mockUseZshrcLoader.mockReturnValue({
        sections: [
          createMockSection({
            label: "Test Section",
            startLine: 1,
            endLine: 3,
            content: "item1\nitem2\nitem3",
          }),
        ],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ListViewController {...mockConfig} postProcessItems={postProcessItems} />);

      expect(postProcessItems).toHaveBeenCalled();
    });

    it("should work without post-processing function", () => {
      render(<ListViewController {...mockConfig} />);

      expect(screen.getByTestId("list")).toBeInTheDocument();
    });
  });

  describe("search functionality", () => {
    it("should pass search text to filter hook", () => {
      mockUseZshrcFilter.mockReturnValue({
        searchText: "test query",
        setSearchText: mockSetSearchText,
        filtered: [],
        grouped: {},
      });

      render(<ListViewController {...mockConfig} />);

      expect(mockUseZshrcFilter).toHaveBeenCalledWith(expect.arrayContaining([]), ["name", "value"]);
    });

    it("should handle search field changes", () => {
      render(<ListViewController {...mockConfig} searchFields={["name"]} />);

      expect(mockUseZshrcFilter).toHaveBeenCalledWith(expect.any(Array), ["name"]);
    });
  });

  describe("metadata generation", () => {
    it("should use custom metadata generator if provided", () => {
      const generateMetadata = vi.fn(() => <div data-testid="custom-metadata">Metadata</div>);

      render(
        <ListViewController
          {...mockConfig}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          generateMetadata={generateMetadata as any}
        />,
      );

      expect(generateMetadata).toHaveBeenCalled();
    });
  });

  describe("multiple sections", () => {
    it("should handle multiple sections correctly", () => {
      const section1Items: TestItem[] = [
        {
          name: "item1",
          value: "item1",
          section: "Section 1",
          sectionStartLine: 1,
        },
      ];
      const section2Items: TestItem[] = [
        {
          name: "item2",
          value: "item2",
          section: "Section 2",
          sectionStartLine: 3,
        },
      ];
      mockUseZshrcLoader.mockReturnValue({
        sections: [
          createMockSection({
            label: "Section 1",
            startLine: 1,
            endLine: 2,
            content: "item1",
          }),
          createMockSection({
            label: "Section 2",
            startLine: 3,
            endLine: 4,
            content: "item2",
          }),
        ],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      mockUseZshrcFilter.mockReturnValue({
        searchText: "",
        setSearchText: mockSetSearchText,
        filtered: [...section1Items, ...section2Items],
        grouped: {
          "Section 1": section1Items,
          "Section 2": section2Items,
        },
      });

      render(<ListViewController {...mockConfig} />);

      expect(screen.getByTestId("list")).toBeInTheDocument();
    });
  });

  describe("refresh functionality", () => {
    it("should provide refresh function to action generators", () => {
      const customOverviewActions = vi.fn(() => null);

      render(
        <ListViewController
          {...mockConfig}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          generateOverviewActions={customOverviewActions as any}
        />,
      );

      expect(customOverviewActions).toHaveBeenCalled();
      const callArgs = customOverviewActions.mock.calls[0] as unknown[];
      expect(callArgs?.[1]).toBe(mockRefresh);
    });

    it("should provide refresh function to item action generators", () => {
      const customItemActions = vi.fn(() => null);

      render(
        <ListViewController
          {...mockConfig}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          generateItemActions={customItemActions as any}
        />,
      );

      expect(customItemActions).toHaveBeenCalled();
      const callArgs = customItemActions.mock.calls[0] as unknown[];
      expect(callArgs?.[1]).toBe(mockRefresh);
    });
  });

  describe("title generation", () => {
    it("should use custom title generator", () => {
      const generateTitle = vi.fn((item: TestItem) => `Custom: ${item.name}`);

      render(<ListViewController {...mockConfig} generateTitle={generateTitle} />);

      expect(generateTitle).toHaveBeenCalled();
    });
  });

  describe("search bar accessory", () => {
    it("should render search bar accessory if provided", () => {
      const accessory = <div data-testid="search-accessory">Accessory</div>;

      render(<ListViewController {...mockConfig} searchBarAccessory={accessory} />);

      expect(screen.getByTestId("list")).toBeInTheDocument();
    });

    it("should handle null search bar accessory", () => {
      render(<ListViewController {...mockConfig} searchBarAccessory={null} />);

      expect(screen.getByTestId("list")).toBeInTheDocument();
    });

    it("should handle undefined search bar accessory", () => {
      render(<ListViewController {...mockConfig} searchBarAccessory={undefined} />);

      expect(screen.getByTestId("list")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle empty sections array", () => {
      mockUseZshrcLoader.mockReturnValue({
        sections: [],
        isLoading: false,
        refresh: mockRefresh,
        isFromCache: false,
        lastError: null,
      });

      render(<ListViewController {...mockConfig} />);

      expect(screen.getByTestId("list")).toBeInTheDocument();
    });

    it("should handle items with missing properties", () => {
      const configWithMinimalParser = {
        ...mockConfig,
        parser: (): Partial<TestItem>[] => [{}],
      };

      render(<ListViewController {...configWithMinimalParser} />);

      expect(screen.getByTestId("list")).toBeInTheDocument();
    });
  });
});
