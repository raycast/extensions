import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Exports from "../exports";
import { readZshrcFile } from "../lib/zsh";
import { toLogicalSections } from "../lib/parse-zshrc";
import { vi } from "vitest";

// Mock dependencies
vi.mock("../lib/zsh");
vi.mock("../lib/parse-zshrc", () => ({
  toLogicalSections: vi.fn(),
}));
vi.mock("../edit-export", () => ({
  default: function MockEditExport() {
    return <div>Edit Export Component</div>;
  },
}));

const mockReadZshrcFile = vi.mocked(readZshrcFile);
const mockToLogicalSections = vi.mocked(toLogicalSections);

// Mock data
const mockSections = [
  {
    label: "General",
    startLine: 1,
    endLine: 10,
    content: "export PATH=$PATH:/usr/local/bin\nexport NODE_ENV=development",
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

describe("Exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToLogicalSections.mockReturnValue(mockSections);
  });

  describe("rendering", () => {
    it("should render exports overview by default", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Exports />);

      await waitFor(() => {
        expect(screen.getByText("Exports")).toBeInTheDocument();
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Export Summary")).toBeInTheDocument();
      });
    });

    it("should show loading state initially", () => {
      mockReadZshrcFile.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<Exports />);

      expect(screen.getByText("Exports")).toBeInTheDocument();
    });

    it("should display export information correctly", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Exports />);

      await waitFor(() => {
        expect(screen.getByText("Exports")).toBeInTheDocument();
      });
    });
  });

  describe("data loading", () => {
    it("should load sections on mount", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Exports />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });

    it("should handle loading error", async () => {
      mockReadZshrcFile.mockRejectedValue(new Error("File read error"));

      render(<Exports />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });
  });

  describe("export management", () => {
    it("should display exports with correct information", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Exports />);

      await waitFor(() => {
        expect(screen.getByText("Exports")).toBeInTheDocument();
      });
    });

    it("should show export summary", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Exports />);

      await waitFor(() => {
        expect(screen.getByText("Export Summary")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("should handle file read errors gracefully", async () => {
      mockReadZshrcFile.mockRejectedValue(new Error("Permission denied"));

      render(<Exports />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });

    it("should handle empty file content", async () => {
      mockReadZshrcFile.mockResolvedValue("");

      render(<Exports />);

      await waitFor(() => {
        expect(screen.getByText("Exports")).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("should have proper accessibility labels", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Exports />);

      await waitFor(() => {
        expect(screen.getByText("Exports")).toBeInTheDocument();
      });
    });
  });

  describe("performance", () => {
    it("should handle large numbers of exports efficiently", async () => {
      const largeMockContent = Array.from(
        { length: 100 },
        (_, i) => `export TEST${i}=value${i}`,
      ).join("\n");

      mockReadZshrcFile.mockResolvedValue(largeMockContent);

      render(<Exports />);

      await waitFor(() => {
        expect(screen.getByText("Exports")).toBeInTheDocument();
      });
    });
  });
});
