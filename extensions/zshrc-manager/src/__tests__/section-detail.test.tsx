import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SectionDetail } from "../section-detail";
import type { LogicalSection } from "../lib/parse-zshrc";

// Mock zsh module
vi.mock("../lib/zsh", () => ({
  getZshrcPath: vi.fn(() => "/test/.zshrc"),
}));

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

describe("SectionDetail", () => {
  const mockSection = createMockSection("Aliases", 1, 10, "alias ll='ls -la'\nalias gs='git status'", {
    aliasCount: 2,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("component rendering", () => {
    it("should render SectionDetail component", () => {
      render(<SectionDetail section={mockSection} />);
      expect(screen.getAllByText(/Aliases/).length).toBeGreaterThan(0);
    });

    it("should render with custom actions", () => {
      const customActions = <div data-testid="custom-actions">Custom Actions</div>;
      render(<SectionDetail section={mockSection} actions={customActions} />);

      expect(screen.getAllByText(/Aliases/).length).toBeGreaterThan(0);
    });
  });

  describe("display modes", () => {
    it("should use formatted display mode by default", () => {
      render(<SectionDetail section={mockSection} />);
      expect(screen.getAllByText(/Aliases/).length).toBeGreaterThan(0);
    });

    it("should handle raw display mode", () => {
      render(<SectionDetail section={mockSection} displayMode="raw" />);
      expect(screen.getAllByText(/Aliases/).length).toBeGreaterThan(0);
    });

    it("should handle compact display mode", () => {
      render(<SectionDetail section={mockSection} displayMode="compact" />);
      expect(screen.getAllByText(/Aliases/).length).toBeGreaterThan(0);
    });
  });

  describe("secret masking", () => {
    it("masks secret export values in every display mode", () => {
      const secretSection = createMockSection("Env", 1, 3, "export MY_TOKEN=abcdefghijklmnop\nexport EDITOR=vim", {
        exportCount: 2,
      });

      for (const displayMode of ["formatted", "raw", "compact"] as const) {
        const { unmount } = render(<SectionDetail section={secretSection} displayMode={displayMode} />);
        expect(screen.queryByText(/abcdefghijklmnop/)).not.toBeInTheDocument();
        expect(screen.getAllByText(/abc•••••nop/).length).toBeGreaterThan(0);
        // Non-secret values stay visible
        expect(screen.getAllByText(/vim/).length).toBeGreaterThan(0);
        unmount();
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty section content", () => {
      const emptySection = createMockSection("Empty", 1, 1, "");
      render(<SectionDetail section={emptySection} />);

      expect(screen.getAllByText(/Empty/).length).toBeGreaterThan(0);
    });

    it("should handle section with special characters", () => {
      const specialSection = createMockSection("SpecialSection", 1, 5, "alias test='echo \"hello\"'", {
        aliasCount: 1,
      });
      render(<SectionDetail section={specialSection} />);

      expect(screen.getAllByText(/SpecialSection/).length).toBeGreaterThan(0);
    });

    it("should handle unicode content", () => {
      const unicodeSection = createMockSection("UnicodeSection", 1, 5, "alias hello='echo 你好'", {
        aliasCount: 1,
      });

      render(<SectionDetail section={unicodeSection} />);
      expect(screen.getAllByText(/UnicodeSection/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/你好/).length).toBeGreaterThan(0);
    });
  });
});
