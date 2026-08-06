/**
 * Tests for the focused views the home surface pushes into.
 *
 * Every view renders standalone (no searchBarAccessory), which frees the
 * accessory slot for the warning filter — the criterion that has been
 * unreachable since launch is asserted here for the views that have a
 * warning generator.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LogicalSection } from "../lib/parse-zshrc";
import { createMockSection } from "./fixtures/sections";

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

vi.mock("../lib/resolve", () => ({
  findShadowedExecutable: vi.fn(() => null),
  sourceFileExists: vi.fn(() => "unknown"),
  pluginInstalled: vi.fn(() => "unknown"),
}));

vi.mock("../lib/zsh", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/zsh")>();
  return { ...actual, getZshrcPath: vi.fn(() => "/test/.zshrc") };
});

import { useZshrcLoader } from "../hooks/useZshrcLoader";
import Aliases from "../aliases";
import Exports from "../exports";
import Functions from "../functions";
import Plugins from "../plugins";
import Sources from "../sources";
import Evals from "../evals";
import Setopts from "../setopts";
import PathEntries from "../path-entries";
import FpathEntries from "../fpath-entries";
import Keybindings from "../keybindings";

const mockUseZshrcLoader = vi.mocked(useZshrcLoader);

const richSections: LogicalSection[] = [
  createMockSection({
    label: "Everything",
    content: [
      "alias gs='git status'",
      "export EDITOR=vim",
      "export MY_API_KEY=secret123456",
      "my_func() {",
      "}",
      "plugins=(git docker)",
      "source ~/.config/zsh/extra.zsh",
      'eval "$(starship init zsh)"',
      "setopt AUTO_CD",
      "export PATH=$PATH:/opt/homebrew/bin",
      "fpath+=/opt/homebrew/share/zsh/site-functions",
      "bindkey '^R' history-incremental-search-backward",
    ].join("\n"),
  }),
];

const loaderResult = (sections: LogicalSection[]) => ({
  sections,
  isLoading: false,
  refresh: mockRefresh,
  isFromCache: false,
  lastError: null,
});

describe("focused views", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseZshrcLoader.mockReturnValue(loaderResult(richSections));
  });

  const cases: Array<[string, () => React.ReactElement, string]> = [
    ["Aliases", () => <Aliases />, "gs"],
    ["Exports", () => <Exports />, "EDITOR"],
    ["Functions", () => <Functions />, "my_func"],
    ["Plugins", () => <Plugins />, "docker"],
    ["Sources", () => <Sources />, "extra.zsh"],
    ["Evals", () => <Evals />, "starship"],
    ["Setopts", () => <Setopts />, "AUTO_CD"],
    ["PATH Entries", () => <PathEntries />, "homebrew"],
    ["FPATH Entries", () => <FpathEntries />, "site-functions"],
    ["Keybindings", () => <Keybindings />, "history-incremental-search-backward"],
  ];

  it.each(cases)("%s renders its parsed items", (title, component, expectedFragment) => {
    render(component());
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(expectedFragment)).length).toBeGreaterThan(0);
  });

  it.each([
    ["Aliases", () => <Aliases />],
    ["Exports", () => <Exports />],
    ["Plugins", () => <Plugins />],
    ["Sources", () => <Sources />],
  ])("%s exposes the warning filter in the freed accessory slot", (_title, component) => {
    render(component());
    const accessory = screen.getByTestId("search-bar-accessory");
    expect(accessory).toBeInTheDocument();
    expect(accessory.textContent).toContain("With Warnings");
    expect(accessory.textContent).toContain("Without Warnings");
  });

  it("suppresses the warning filter when an accessory is supplied", () => {
    render(<Aliases searchBarAccessory={<div data-testid="external-accessory" />} />);
    expect(screen.getByTestId("external-accessory")).toBeInTheDocument();
    expect(screen.queryByText("With Warnings (0)")).not.toBeInTheDocument();
  });

  it("masks secret export values in the detail pane", () => {
    render(<Exports />);
    // The masked value renders; the raw secret never does
    expect(screen.queryAllByText(/secret123456/).length).toBe(0);
  });

  it("shows the empty view when nothing parses", () => {
    mockUseZshrcLoader.mockReturnValue(loaderResult([]));
    render(<Aliases />);
    expect(screen.getByTestId("list-empty-view")).toBeInTheDocument();
  });
});
