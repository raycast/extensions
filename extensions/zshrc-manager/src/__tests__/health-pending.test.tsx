/**
 * While the async broken-source check is in flight, health badges must
 * render a pending state — never a settled "All clear" that later flips.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Tools from "../tools";
import { createMockSection } from "./fixtures/sections";

vi.mock("../health-check", () => ({ default: () => <div data-testid="health-view" /> }));
vi.mock("../backup-manager", () => ({ default: () => <div data-testid="backup-view" /> }));
vi.mock("../history-view", () => ({ default: () => <div data-testid="history-view" /> }));

const mockUseZshrcLoader = vi.fn();
vi.mock("../hooks/useZshrcLoader", () => ({
  useZshrcLoader: (...args: unknown[]) => mockUseZshrcLoader(...args),
}));

// A broken-source check that never settles keeps the report in its
// checking state for the lifetime of the test
vi.mock("../utils/validation", async (importOriginal) => {
  const original = await importOriginal<typeof import("../utils/validation")>();
  return {
    ...original,
    detectBrokenSources: vi.fn(() => new Promise(() => {})),
  };
});

describe("health badge while the source check is pending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseZshrcLoader.mockReturnValue({
      sections: [
        createMockSection({
          label: "Sources",
          content: "source /opt/somewhere/init.zsh",
          startLine: 1,
          endLine: 2,
        }),
      ],
      isLoading: false,
      refresh: vi.fn(),
      isFromCache: false,
      lastError: null,
    });
  });

  it("shows a pending badge instead of All clear", () => {
    render(<Tools />);
    expect(screen.getByText("Checking…")).toBeInTheDocument();
    expect(screen.queryByText("All clear")).not.toBeInTheDocument();
  });
});
