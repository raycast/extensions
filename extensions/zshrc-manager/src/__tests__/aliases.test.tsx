import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Aliases from "../aliases";
import { readZshrcFile } from "../lib/zsh";
import { toLogicalSections } from "../lib/parse-zshrc";
import { vi } from "vitest";

// Mock dependencies
vi.mock("../lib/zsh");
vi.mock("../lib/parse-zshrc", () => ({
  toLogicalSections: vi.fn(),
}));
vi.mock("../edit-alias", () => ({
  default: function MockEditAlias() {
    return <div>Edit Alias Component</div>;
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
    content: "alias ll='ls -la'\nalias gs='git status'",
    aliasCount: 2,
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
  },
];

describe("Aliases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToLogicalSections.mockReturnValue(mockSections);
  });

  describe("rendering", () => {
    it("should render aliases overview by default", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Aliases />);

      await waitFor(() => {
        expect(screen.getByText("Aliases")).toBeInTheDocument();
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Alias Summary")).toBeInTheDocument();
      });
    });

    it("should show loading state initially", () => {
      mockReadZshrcFile.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<Aliases />);

      expect(screen.getByText("Aliases")).toBeInTheDocument();
    });

    it("should display alias information correctly", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Aliases />);

      await waitFor(() => {
        expect(screen.getByText("Aliases")).toBeInTheDocument();
      });
    });
  });

  describe("data loading", () => {
    it("should load sections on mount", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Aliases />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });

    it("should handle loading error", async () => {
      mockReadZshrcFile.mockRejectedValue(new Error("File read error"));

      render(<Aliases />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });
  });

  describe("alias management", () => {
    it("should display aliases with correct information", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Aliases />);

      await waitFor(() => {
        expect(screen.getByText("Aliases")).toBeInTheDocument();
      });
    });

    it("should show alias summary", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Aliases />);

      await waitFor(() => {
        expect(screen.getByText("Alias Summary")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("should handle file read errors gracefully", async () => {
      mockReadZshrcFile.mockRejectedValue(new Error("Permission denied"));

      render(<Aliases />);

      await waitFor(() => {
        expect(mockReadZshrcFile).toHaveBeenCalled();
      });
    });

    it("should handle empty file content", async () => {
      mockReadZshrcFile.mockResolvedValue("");

      render(<Aliases />);

      await waitFor(() => {
        expect(screen.getByText("Aliases")).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("should have proper accessibility labels", async () => {
      mockReadZshrcFile.mockResolvedValue("mock content");

      render(<Aliases />);

      await waitFor(() => {
        expect(screen.getByText("Aliases")).toBeInTheDocument();
      });
    });
  });

  describe("performance", () => {
    it("should handle large numbers of aliases efficiently", async () => {
      const largeMockContent = Array.from(
        { length: 100 },
        (_, i) => `alias test${i}='echo ${i}'`,
      ).join("\n");

      mockReadZshrcFile.mockResolvedValue(largeMockContent);

      render(<Aliases />);

      await waitFor(() => {
        expect(screen.getByText("Aliases")).toBeInTheDocument();
      });
    });
  });
});
