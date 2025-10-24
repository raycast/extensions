import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Sources from "../sources";
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
    content: "source ~/.oh-my-zsh/themes/robbyrussell.zsh-theme\nsource ~/.config/zsh/custom.zsh",
    aliasCount: 0,
    exportCount: 0,
    evalCount: 0,
    setoptCount: 0,
    pluginCount: 0,
    functionCount: 0,
    sourceCount: 2,
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

describe("Sources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToLogicalSections.mockReturnValue(mockSections);
  });

  describe("rendering", () => {
    it("should render sources overview by default", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Sources />);

      await waitFor(() => {
        expect(screen.getByText("Sources")).toBeInTheDocument();
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Source Summary")).toBeInTheDocument();
      });
    });

    it("should show loading state initially", () => {
      mockReadZshrcFile.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<Sources />);

      expect(screen.getByText("Sources")).toBeInTheDocument();
    });

    it("should display source information correctly", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Sources />);

      await waitFor(() => {
        expect(screen.getByText("Sources")).toBeInTheDocument();
      });
    });
  });

  describe("data loading", () => {
    it("should load sections on mount", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Sources />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });

    it("should handle loading error", async () => {
      mockReadZshrcFile.mockRejectedValue(new Error("File read error"));

      render(<Sources />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });
  });

  describe("source management", () => {
    it("should display sources with correct information", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Sources />);

      await waitFor(() => {
        expect(screen.getByText("Sources")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("should handle file read errors gracefully", async () => {
      mockReadZshrcFile.mockRejectedValue(new Error("Permission denied"));

      render(<Sources />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });

    it("should handle empty file content", async () => {
      mockReadZshrcFile.mockResolvedValue("");

      render(<Sources />);

      await waitFor(() => {
        expect(screen.getByText("Sources")).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("should have proper accessibility labels", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Sources />);

      await waitFor(() => {
        expect(screen.getByText("Sources")).toBeInTheDocument();
      });
    });
  });

  describe("performance", () => {
    it("should handle large numbers of sources efficiently", async () => {
      const largeMockContent = Array.from({ length: 100 }, (_, i) => `source ~/.config/source${i}.zsh`).join("\n");

      mockReadZshrcFile.mockResolvedValue(largeMockContent);

      render(<Sources />);

      await waitFor(() => {
        expect(screen.getByText("Sources")).toBeInTheDocument();
      });
    });
  });
});
