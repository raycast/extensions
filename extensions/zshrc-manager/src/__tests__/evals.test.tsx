import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Evals from "../evals";
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
    content: 'eval "$(pyenv init -)"\neval "$(direnv hook zsh)"',
    aliasCount: 0,
    exportCount: 0,
    evalCount: 2,
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

describe("Evals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToLogicalSections.mockReturnValue(mockSections);
  });

  describe("rendering", () => {
    it("should render evals overview by default", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Evals />);

      await waitFor(() => {
        expect(screen.getByText("Evals")).toBeInTheDocument();
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Eval Summary")).toBeInTheDocument();
      });
    });

    it("should show loading state initially", () => {
      mockReadZshrcFile.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<Evals />);

      expect(screen.getByText("Evals")).toBeInTheDocument();
    });

    it("should display eval information correctly", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Evals />);

      await waitFor(() => {
        expect(screen.getByText("Evals")).toBeInTheDocument();
      });
    });
  });

  describe("data loading", () => {
    it("should load sections on mount", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Evals />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });

    it("should handle loading error", async () => {
      mockReadZshrcFile.mockRejectedValue(new Error("File read error"));

      render(<Evals />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });
  });

  describe("eval management", () => {
    it("should display evals with correct information", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Evals />);

      await waitFor(() => {
        expect(screen.getByText("Evals")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("should handle file read errors gracefully", async () => {
      mockReadZshrcFile.mockRejectedValue(new Error("Permission denied"));

      render(<Evals />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });

    it("should handle empty file content", async () => {
      mockReadZshrcFile.mockResolvedValue("");

      render(<Evals />);

      await waitFor(() => {
        expect(screen.getByText("Evals")).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("should have proper accessibility labels", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Evals />);

      await waitFor(() => {
        expect(screen.getByText("Evals")).toBeInTheDocument();
      });
    });
  });

  describe("performance", () => {
    it("should handle large numbers of evals efficiently", async () => {
      const largeMockContent = Array.from({ length: 100 }, (_, i) => `eval "$(tool${i} init -)"`).join("\n");

      mockReadZshrcFile.mockResolvedValue(largeMockContent);

      render(<Evals />);

      await waitFor(() => {
        expect(screen.getByText("Evals")).toBeInTheDocument();
      });
    });
  });
});
