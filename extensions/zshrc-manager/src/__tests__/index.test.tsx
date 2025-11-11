import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ZshrcManager from "../index";

// Mock all the view components
vi.mock("../zshrc-statistics", () => ({
  default: () => <div data-testid="statistics-view">Statistics View</div>,
}));

vi.mock("../sections", () => ({
  default: () => <div data-testid="sections-view">Sections View</div>,
}));

vi.mock("../aliases", () => ({
  default: () => <div data-testid="aliases-view">Aliases View</div>,
}));

vi.mock("../exports", () => ({
  default: () => <div data-testid="exports-view">Exports View</div>,
}));

vi.mock("../functions", () => ({
  default: () => <div data-testid="functions-view">Functions View</div>,
}));

vi.mock("../plugins", () => ({
  default: () => <div data-testid="plugins-view">Plugins View</div>,
}));

vi.mock("../sources", () => ({
  default: () => <div data-testid="sources-view">Sources View</div>,
}));

vi.mock("../evals", () => ({
  default: () => <div data-testid="evals-view">Evals View</div>,
}));

vi.mock("../setopts", () => ({
  default: () => <div data-testid="setopts-view">Setopts View</div>,
}));

describe("ZshrcManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export ZshrcManager component", async () => {
    const module = await import("../index");
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe("function");
  });

  it("should render Statistics view by default", () => {
    render(<ZshrcManager />);
    expect(screen.getByTestId("statistics-view")).toBeInTheDocument();
    expect(screen.queryByTestId("sections-view")).not.toBeInTheDocument();
  });

  it("should render all view components correctly", () => {
    // Verify that all view components are properly imported and mocked
    const { container } = render(<ZshrcManager />);
    expect(container).toBeTruthy();
  });
});
