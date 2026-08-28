/**
 * Component tests for lib/list-view-controller.tsx — the shared list that
 * every type view renders through: parsing sections into items, warning
 * accessories and the warning filter dropdown, frecency-off ordering,
 * overview row, and the empty state.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Icon, Color } from "@raycast/api";
import { ListViewController, type FilterableItem, type ItemWarning } from "../lib/list-view-controller";
import type { LogicalSection } from "../lib/parse-zshrc";

const mockRefresh = vi.fn();
const mockUseZshrcLoader = vi.fn();
vi.mock("../hooks/useZshrcLoader", () => ({
  useZshrcLoader: (...args: unknown[]) => mockUseZshrcLoader(...args),
}));

vi.mock("@raycast/utils", () => ({
  useFrecencySorting: vi.fn((items: unknown[]) => ({ data: items, visitItem: vi.fn() })),
}));

interface TestItem extends FilterableItem {
  name: string;
}

const section = (label: string, content: string, startLine = 1): LogicalSection => ({
  label,
  startLine,
  endLine: startLine + content.split("\n").length,
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
});

const parser = (content: string): Array<Partial<TestItem>> =>
  content
    .split("\n")
    .filter((line) => line.startsWith("item "))
    .map((line) => ({ name: line.slice(5) }));

const baseConfig = {
  commandName: "Test",
  navigationTitle: "Test Items",
  searchPlaceholder: "Search...",
  icon: Icon.Terminal,
  tintColor: "#000000",
  itemType: "test item",
  itemTypePlural: "test items",
  parser,
  searchFields: ["name", "section"],
  generateTitle: (item: TestItem) => item.name,
  generateOverviewMarkdown: () => "# Overview",
  generateItemMarkdown: (item: TestItem) => `# ${item.name}`,
};

describe("ListViewController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseZshrcLoader.mockReturnValue({
      sections: [section("Alpha", "item one\nitem two"), section("Beta", "item three", 10)],
      isLoading: false,
      refresh: mockRefresh,
    });
  });

  it("renders parsed items grouped by section", () => {
    render(<ListViewController<TestItem> {...baseConfig} />);
    expect(screen.getByText("one")).toBeTruthy();
    expect(screen.getByText("two")).toBeTruthy();
    expect(screen.getByText("three")).toBeTruthy();
    // Section names render as accessories
    expect(screen.getAllByText("Alpha").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beta").length).toBeGreaterThan(0);
  });

  it("renders the overview row with the total count", () => {
    render(<ListViewController<TestItem> {...baseConfig} />);
    expect(screen.getByText("Test item Summary")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("shows warning accessories for items the generator flags", () => {
    const warningGenerator = (item: TestItem): ItemWarning | null =>
      item.name === "two" ? { type: "broken", message: "flagged", icon: Icon.ExclamationMark, color: Color.Red } : null;

    render(<ListViewController<TestItem> {...baseConfig} warningGenerator={warningGenerator} />);
    // One warning icon accessory rendered (mock renders accessories' icons as "icon")
    expect(screen.getAllByText("icon").length).toBeGreaterThan(0);
  });

  it("renders the warning filter dropdown when enabled", () => {
    const warningGenerator = (item: TestItem): ItemWarning | null =>
      item.name === "two" ? { type: "broken", message: "flagged", icon: Icon.ExclamationMark, color: Color.Red } : null;

    render(
      <ListViewController<TestItem> {...baseConfig} warningGenerator={warningGenerator} showWarningFilter={true} />,
    );
    const accessory = screen.getByTestId("search-bar-accessory");
    expect(accessory.textContent).toContain("With Warnings (1)");
    expect(accessory.textContent).toContain("Without Warnings");
  });

  it("omits the warning filter when disabled", () => {
    render(<ListViewController<TestItem> {...baseConfig} />);
    expect(screen.queryByTestId("search-bar-accessory")).toBeNull();
  });

  it("shows the empty state when nothing parses", () => {
    mockUseZshrcLoader.mockReturnValue({
      sections: [section("Alpha", "nothing here")],
      isLoading: false,
      refresh: mockRefresh,
    });
    render(<ListViewController<TestItem> {...baseConfig} />);
    expect(screen.getByText("No test items match your search")).toBeTruthy();
  });

  it("applies postProcessItems before rendering", () => {
    render(
      <ListViewController<TestItem>
        {...baseConfig}
        postProcessItems={(items) => items.filter((item) => item.name !== "two")}
      />,
    );
    expect(screen.getByText("one")).toBeTruthy();
    expect(screen.queryByText("two")).toBeNull();
  });
});
