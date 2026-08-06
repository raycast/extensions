/**
 * Tests for the unified home surface: overview sections at rest,
 * flat cross-type results while typing, catalogue matches inline,
 * and the live health badge.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ZshrcManager from "../index";
import { createMockSection } from "./fixtures/sections";

// Focused views and tools are pushed, not rendered on home — stub them
vi.mock("../aliases", () => ({ default: () => <div data-testid="aliases-view" /> }));
vi.mock("../exports", () => ({ default: () => <div data-testid="exports-view" /> }));
vi.mock("../functions", () => ({ default: () => <div data-testid="functions-view" /> }));
vi.mock("../plugins", () => ({ default: () => <div data-testid="plugins-view" /> }));
vi.mock("../sources", () => ({ default: () => <div data-testid="sources-view" /> }));
vi.mock("../evals", () => ({ default: () => <div data-testid="evals-view" /> }));
vi.mock("../setopts", () => ({ default: () => <div data-testid="setopts-view" /> }));
vi.mock("../path-entries", () => ({ default: () => <div data-testid="path-view" /> }));
vi.mock("../fpath-entries", () => ({ default: () => <div data-testid="fpath-view" /> }));
vi.mock("../keybindings", () => ({ default: () => <div data-testid="keybindings-view" /> }));
vi.mock("../sections", () => ({ default: () => <div data-testid="sections-view" /> }));
vi.mock("../health-check", () => ({ default: () => <div data-testid="health-view" /> }));
vi.mock("../backup-manager", () => ({ default: () => <div data-testid="backup-view" /> }));
vi.mock("../browse-aliases", () => ({ default: () => <div data-testid="browse-view" /> }));
vi.mock("../history-view", () => ({ default: () => <div data-testid="history-view" /> }));
vi.mock("../collection-detail", () => ({ default: () => <div data-testid="collection-view" /> }));

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

vi.mock("../hooks/useAliasCollections", () => ({
  useAliasCollections: vi.fn(() => ({
    collections: [
      {
        id: "git",
        name: "Git Aliases",
        description: "Shortcuts for common git commands",
        category: "Version Control",
        tags: ["git"],
        source: { type: "curated" },
      },
    ],
    loadedCollections: new Map(),
    loadCollection: vi.fn().mockResolvedValue(null),
    refreshCollection: vi.fn(),
    refreshManifest: vi.fn(),
    getCollection: vi.fn(() => undefined),
    isLoading: vi.fn(() => false),
    manifestLoading: false,
    error: null,
  })),
}));

vi.mock("../lib/resolve", () => ({
  findShadowedExecutable: vi.fn(() => null),
  sourceFileExists: vi.fn(() => "unknown"),
  pluginInstalled: vi.fn(() => "unknown"),
}));

// Broken-source detection touches the filesystem; keep duplicates real
vi.mock("../utils/validation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/validation")>();
  return {
    ...actual,
    detectBrokenSources: vi.fn(() => Promise.resolve({ brokenSources: [], totalBroken: 0 })),
  };
});

import { useZshrcLoader } from "../hooks/useZshrcLoader";

const mockUseZshrcLoader = vi.mocked(useZshrcLoader);

const loaderResult = (sections: ReturnType<typeof createMockSection>[]) => ({
  sections,
  isLoading: false,
  refresh: mockRefresh,
  isFromCache: false,
  lastError: null,
});

const populatedSections = [
  createMockSection({
    label: "Git",
    content: ["alias gs='git status'", "alias gp='git push'", "export GIT_EDITOR=vim"].join("\n"),
  }),
  createMockSection({
    label: "Paths",
    content: ["export PATH=$PATH:/opt/homebrew/bin", "source ~/.config/zsh/extra.zsh", "setopt AUTO_CD"].join("\n"),
    startLine: 11,
    endLine: 20,
  }),
];

describe("ZshrcManager home surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseZshrcLoader.mockReturnValue(loaderResult(populatedSections));
  });

  describe("at rest", () => {
    it("renders the overview sections", () => {
      render(<ZshrcManager />);
      expect(screen.getByText("Health")).toBeInTheDocument();
      expect(screen.getByText("Browse")).toBeInTheDocument();
      expect(screen.getByText("Discover")).toBeInTheDocument();
      // The at-rest shelf moved into Browse as a pushable view
      expect(screen.getByText("Recently Managed")).toBeInTheDocument();
      expect(screen.queryByText("Recent & Frequent")).not.toBeInTheDocument();
    });

    it("renders Browse categories only for types present, with counts", () => {
      render(<ZshrcManager />);
      expect(screen.getByText("Aliases")).toBeInTheDocument();
      expect(screen.getByText("Exports")).toBeInTheDocument();
      expect(screen.getByText("Sources")).toBeInTheDocument();
      expect(screen.getByText("Setopts")).toBeInTheDocument();
      // No functions/plugins/keybindings in the fixture: no category rows
      expect(screen.queryByText("Functions")).not.toBeInTheDocument();
      expect(screen.queryByText("Plugins")).not.toBeInTheDocument();
      expect(screen.queryByText("Keybindings")).not.toBeInTheDocument();
    });

    it("renders the health row and the collections row; other tools live in the Tools command", () => {
      render(<ZshrcManager />);
      expect(screen.getAllByText("Health Check").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Browse Alias Collections").length).toBeGreaterThan(0);
      // Backup Manager and History have no at-rest rows — they are reachable
      // via the action panel (shortcuts), search, and the Tools command
      expect(screen.queryByText("Restore or diff a previous version")).not.toBeInTheDocument();
    });

    it("shows an All clear health badge when nothing is wrong", async () => {
      render(<ZshrcManager />);
      await waitFor(() => expect(screen.getByText("All clear")).toBeInTheDocument());
    });

    it("shows a live issue count when duplicates exist", async () => {
      mockUseZshrcLoader.mockReturnValue(
        loaderResult([
          createMockSection({ label: "One", content: "alias gs='git status'" }),
          createMockSection({ label: "Two", content: "alias gs='git switch'", startLine: 11 }),
        ]),
      );
      render(<ZshrcManager />);
      await waitFor(() => expect(screen.getByText("1 issue")).toBeInTheDocument());
    });
  });

  describe("while typing", () => {
    it("hides the overview and shows flat cross-type results", () => {
      render(<ZshrcManager />);
      fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "git" } });
      expect(screen.queryByText("Browse")).not.toBeInTheDocument();
      expect(screen.queryByText("Recent & Frequent")).not.toBeInTheDocument();
      expect(screen.getByText("In Your Zshrc")).toBeInTheDocument();
      // Alias and export matches appear side by side, cross-type
      expect(screen.getByText("gs")).toBeInTheDocument();
      expect(screen.getByText("GIT_EDITOR")).toBeInTheDocument();
    });

    it("shows catalogue matches under Available to Add", () => {
      render(<ZshrcManager />);
      fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "git" } });
      expect(screen.getByText("Available to Add")).toBeInTheDocument();
      expect(screen.getByText("Git Aliases")).toBeInTheDocument();
    });

    it("matches tools by name while typing", () => {
      render(<ZshrcManager />);
      fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "backup" } });
      expect(screen.getAllByText("Backup Manager").length).toBeGreaterThan(0);
      expect(screen.queryByText("In Your Zshrc")).not.toBeInTheDocument();
    });

    it("shows the empty view when nothing matches", () => {
      render(<ZshrcManager />);
      fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "zzz-no-match" } });
      expect(screen.getByText("Nothing matches")).toBeInTheDocument();
    });
  });

  describe("empty configuration", () => {
    it("renders without crashing and keeps tools reachable", () => {
      mockUseZshrcLoader.mockReturnValue(loaderResult([]));
      render(<ZshrcManager />);
      expect(screen.getByText("Health")).toBeInTheDocument();
      expect(screen.getAllByText("Health Check").length).toBeGreaterThan(0);
    });
  });
});
