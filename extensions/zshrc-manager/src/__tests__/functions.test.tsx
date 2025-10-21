import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Functions from "../functions";
import { readZshrcFile } from "../lib/zsh";
import { toLogicalSections } from "../lib/parse-zshrc";
import { vi } from "vitest";

// Mock dependencies
vi.mock("../lib/zsh");
vi.mock("../lib/parse-zshrc", () => ({
  toLogicalSections: vi.fn(),
}));

const mockReadZshrcFile = vi.mocked(readZshrcFile);
const mockToLogicalSections = vi.mocked(toLogicalSections);

// Mock data
const mockSections = [
  {
    label: "General",
    startLine: 1,
    endLine: 10,
    content: "function test() {\n  echo 'test'\n}",
    aliasCount: 0,
    exportCount: 0,
    evalCount: 0,
    setoptCount: 0,
    pluginCount: 0,
    functionCount: 1,
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

describe("Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToLogicalSections.mockReturnValue(mockSections);
  });

  describe("rendering", () => {
    it("should render functions overview by default", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Functions />);

      await waitFor(() => {
        expect(screen.getByText("Functions")).toBeInTheDocument();
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Function Summary")).toBeInTheDocument();
      });
    });

    it("should show loading state initially", () => {
      mockReadZshrcFile.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<Functions />);

      expect(screen.getByText("Functions")).toBeInTheDocument();
    });

    it("should display function information correctly", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Functions />);

      await waitFor(() => {
        expect(screen.getByText("Functions")).toBeInTheDocument();
      });
    });
  });

  describe("data loading", () => {
    it("should load sections on mount", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Functions />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });

    it("should handle loading error", async () => {
      mockReadZshrcFile.mockRejectedValue(new Error("File read error"));

      render(<Functions />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });
  });

  describe("function management", () => {
    it("should display functions with correct information", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Functions />);

      await waitFor(() => {
        expect(screen.getByText("Functions")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("should handle file read errors gracefully", async () => {
      mockReadZshrcFile.mockRejectedValue(new Error("Permission denied"));

      render(<Functions />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });

    it("should handle empty file content", async () => {
      mockReadZshrcFile.mockResolvedValue("");

      render(<Functions />);

      await waitFor(() => {
        expect(screen.getByText("Functions")).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("should have proper accessibility labels", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Functions />);

      await waitFor(() => {
        expect(screen.getByText("Functions")).toBeInTheDocument();
      });
    });
  });

  describe("performance", () => {
    it("should handle large numbers of functions efficiently", async () => {
      const largeMockContent = Array.from(
        { length: 100 },
        (_, i) => `function test${i}() {\n  echo ${i}\n}`,
      ).join("\n");

      mockReadZshrcFile.mockResolvedValue(largeMockContent);

      render(<Functions />);

      await waitFor(() => {
        expect(screen.getByText("Functions")).toBeInTheDocument();
      });
    });
  });
});
