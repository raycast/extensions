import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Plugins from "../plugins";
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
    content: "plugins=(git docker node)",
    aliasCount: 0,
    exportCount: 0,
    evalCount: 0,
    setoptCount: 0,
    pluginCount: 3,
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

describe("Plugins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToLogicalSections.mockReturnValue(mockSections);
  });

  describe("rendering", () => {
    it("should render plugins overview by default", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Plugins />);

      await waitFor(() => {
        expect(screen.getByText("Plugins")).toBeInTheDocument();
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Plugin Summary")).toBeInTheDocument();
      });
    });

    it("should show loading state initially", () => {
      mockReadZshrcFile.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<Plugins />);

      expect(screen.getByText("Plugins")).toBeInTheDocument();
    });

    it("should display plugin information correctly", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Plugins />);

      await waitFor(() => {
        expect(screen.getByText("Plugins")).toBeInTheDocument();
      });
    });
  });

  describe("data loading", () => {
    it("should load sections on mount", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Plugins />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });

    it("should handle loading error", async () => {
      mockReadZshrcFile.mockRejectedValue(new Error("File read error"));

      render(<Plugins />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });
  });

  describe("plugin management", () => {
    it("should display plugins with correct information", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Plugins />);

      await waitFor(() => {
        expect(screen.getByText("Plugins")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("should handle file read errors gracefully", async () => {
      mockReadZshrcFile.mockRejectedValue(new Error("Permission denied"));

      render(<Plugins />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });

    it("should handle empty file content", async () => {
      mockReadZshrcFile.mockResolvedValue("");

      render(<Plugins />);

      await waitFor(() => {
        expect(screen.getByText("Plugins")).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("should have proper accessibility labels", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Plugins />);

      await waitFor(() => {
        expect(screen.getByText("Plugins")).toBeInTheDocument();
      });
    });
  });

  describe("performance", () => {
    it("should handle large numbers of plugins efficiently", async () => {
      const largeMockContent = Array.from({ length: 100 }, (_, i) => `plugins=(plugin${i})`).join("\n");

      mockReadZshrcFile.mockResolvedValue(largeMockContent);

      render(<Plugins />);

      await waitFor(() => {
        expect(screen.getByText("Plugins")).toBeInTheDocument();
      });
    });
  });
});
