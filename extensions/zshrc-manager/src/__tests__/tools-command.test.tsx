/**
 * Tests for the Tools command: the four tools render as rows, and the
 * health badge reflects the same live detection the home surface uses.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Tools from "../tools";
import { createMockSection } from "./fixtures/sections";

vi.mock("../health-check", () => ({ default: () => <div data-testid="health-view" /> }));
vi.mock("../backup-manager", () => ({ default: () => <div data-testid="backup-view" /> }));
vi.mock("../history-view", () => ({ default: () => <div data-testid="history-view" /> }));

const mockRefresh = vi.fn();
const mockUseZshrcLoader = vi.fn();
vi.mock("../hooks/useZshrcLoader", () => ({
  useZshrcLoader: (...args: unknown[]) => mockUseZshrcLoader(...args),
}));

function loaderResult(sections: unknown[]) {
  return {
    sections,
    isLoading: false,
    refresh: mockRefresh,
    isFromCache: false,
    lastError: null,
  };
}

describe("Tools command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseZshrcLoader.mockReturnValue(loaderResult([]));
  });

  it("renders the three tools; the collection catalogue is discovery, not a tool", () => {
    render(<Tools />);
    expect(screen.getByText("Health Check")).toBeInTheDocument();
    expect(screen.getByText("Backup Manager")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.queryByText("Browse Alias Collections")).not.toBeInTheDocument();
  });

  it("shows All clear on the health row when nothing is wrong", async () => {
    render(<Tools />);
    await waitFor(() => expect(screen.getByText("All clear")).toBeInTheDocument());
  });

  it("shows a live issue count when duplicate aliases exist", async () => {
    mockUseZshrcLoader.mockReturnValue(
      loaderResult([
        createMockSection({
          label: "Aliases",
          content: 'alias gs="git status"\nalias gs="git switch"',
          startLine: 1,
          endLine: 3,
        }),
      ]),
    );
    render(<Tools />);
    await waitFor(() => expect(screen.getAllByText(/\d+ issue/).length).toBeGreaterThan(0));
  });
});
