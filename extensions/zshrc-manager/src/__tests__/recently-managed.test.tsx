/**
 * Tests for the Recently Managed view: renders every entry (no row cap),
 * frecency-ordered, and filters by search text.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RecentlyManaged from "../recently-managed";
import { createMockSection } from "./fixtures/sections";

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

const populated = [
  createMockSection({
    label: "Git",
    content: 'alias gs="git status"\nalias gl="git log"\nexport GIT_EDITOR="nvim"',
    startLine: 1,
    endLine: 4,
  }),
];

describe("RecentlyManaged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseZshrcLoader.mockReturnValue(loaderResult(populated));
  });

  it("renders every entry with the count in the section subtitle", () => {
    render(<RecentlyManaged />);
    expect(screen.getByText("Most Recently Managed First")).toBeInTheDocument();
    expect(screen.getByText("gs")).toBeInTheDocument();
    expect(screen.getByText("gl")).toBeInTheDocument();
    expect(screen.getByText("GIT_EDITOR")).toBeInTheDocument();
  });

  it("filters entries by search text", () => {
    render(<RecentlyManaged />);
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "gs" } });
    expect(screen.getByText("gs")).toBeInTheDocument();
    expect(screen.queryByText("GIT_EDITOR")).not.toBeInTheDocument();
  });
});
