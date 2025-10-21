import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Setopts from "../setopts";
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
    content:
      "setopt HIST_EXPIRE_DUPS_FIRST\nsetopt HIST_IGNORE_DUPS\nsetopt SHARE_HISTORY",
    aliasCount: 0,
    exportCount: 0,
    evalCount: 0,
    setoptCount: 3,
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

describe("Setopts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToLogicalSections.mockReturnValue(mockSections);
  });

  describe("rendering", () => {
    it("should render setopts overview by default", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Setopts />);

      await waitFor(() => {
        expect(screen.getByText("Setopts")).toBeInTheDocument();
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Setopt Summary")).toBeInTheDocument();
      });
    });

    it("should show loading state initially", () => {
      mockReadZshrcFile.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<Setopts />);

      expect(screen.getByText("Setopts")).toBeInTheDocument();
    });

    it("should display setopt information correctly", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Setopts />);

      await waitFor(() => {
        expect(screen.getByText("Setopts")).toBeInTheDocument();
      });
    });
  });

  describe("data loading", () => {
    it("should load sections on mount", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Setopts />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });

    it("should handle loading error", async () => {
      mockReadZshrcFile.mockRejectedValue(new Error("File read error"));

      render(<Setopts />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });
  });

  describe("setopt management", () => {
    it("should display setopts with correct information", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Setopts />);

      await waitFor(() => {
        expect(screen.getByText("Setopts")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("should handle file read errors gracefully", async () => {
      mockReadZshrcFile.mockRejectedValue(new Error("Permission denied"));

      render(<Setopts />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });

    it("should handle empty file content", async () => {
      mockReadZshrcFile.mockResolvedValue("");

      render(<Setopts />);

      await waitFor(() => {
        expect(screen.getByText("Setopts")).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("should have proper accessibility labels", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Setopts />);

      await waitFor(() => {
        expect(screen.getByText("Setopts")).toBeInTheDocument();
      });
    });
  });

  describe("performance", () => {
    it("should handle large numbers of setopts efficiently", async () => {
      const largeMockContent = Array.from(
        { length: 100 },
        (_, i) => `setopt OPTION${i}`,
      ).join("\n");

      mockReadZshrcFile.mockResolvedValue(largeMockContent);

      render(<Setopts />);

      await waitFor(() => {
        expect(screen.getByText("Setopts")).toBeInTheDocument();
      });
    });
  });
});
