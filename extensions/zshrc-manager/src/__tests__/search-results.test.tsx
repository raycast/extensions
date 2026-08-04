import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { LogicalSection } from "../lib/parse-zshrc";
import {
  createSearchResults,
  filterResults,
  groupResultsByType,
  getTypeDisplayName,
  SearchResultListItem,
} from "../lib/search-results";

vi.mock("../lib/zsh", () => ({
  getZshrcPath: vi.fn(() => "/test/.zshrc"),
  getBackupPath: vi.fn(() => "/test/.zshrc.backup"),
  restoreFromBackup: vi.fn(),
  readZshrcFile: vi.fn(async () => ""),
  readZshrcFileRaw: vi.fn(async () => ""),
  writeZshrcFile: vi.fn(),
  checkZshrcAccess: vi.fn(async () => ({ path: "/test/.zshrc", exists: true, readable: true, writable: true })),
}));

const createMockSection = (label: string, content: string): LogicalSection => ({
  label,
  startLine: 1,
  endLine: 10,
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

describe("search-results", () => {
  describe("createSearchResults", () => {
    const sections = [
      createMockSection("Aliases", "alias ll='ls -la'\nalias gs='git status'"),
      createMockSection("Env", "export EDITOR=code\nexport OPENAI_API_KEY=sk-abcdefghijklmnop"),
      createMockSection("Options", "setopt autocd"),
    ];

    it("preserves the section label on every result", () => {
      const results = createSearchResults(sections);
      expect(results.find((r) => r.name === "ll")?.section).toBe("Aliases");
      expect(results.find((r) => r.name === "EDITOR")?.section).toBe("Env");
      expect(results.find((r) => r.name === "autocd")?.section).toBe("Options");
    });

    it("flags secret exports by name and keeps the real value", () => {
      const results = createSearchResults(sections);
      const secret = results.find((r) => r.name === "OPENAI_API_KEY");
      const plain = results.find((r) => r.name === "EDITOR");
      expect(secret?.isSecret).toBe(true);
      expect(secret?.value).toBe("sk-abcdefghijklmnop");
      expect(plain?.isSecret).toBe(false);
    });

    it("carries separate name and value for copy actions", () => {
      const results = createSearchResults(sections);
      const alias = results.find((r) => r.name === "gs");
      expect(alias?.value).toBe("git status");
      expect(alias?.copyValue).toBe("alias gs='git status'");
    });

    it("strips surrounding quotes from export values but copies definitions verbatim", () => {
      const results = createSearchResults([createMockSection("Env", 'export EDITOR="vim"')]);
      const editor = results.find((r) => r.name === "EDITOR");
      // Copy Value pastes the value itself, without the file's quoting
      expect(editor?.value).toBe("vim");
      // Copy Definition reproduces the line as written — no re-quoting
      expect(editor?.copyValue).toBe('export EDITOR="vim"');
      // Edits round-trip the raw right-hand side
      expect(editor?.rawValue).toBe('"vim"');
    });

    it("copies eval definitions without escaping command substitution", () => {
      const results = createSearchResults([createMockSection("Init", "eval $(brew shellenv)")]);
      expect(results[0]?.copyValue).toBe("eval $(brew shellenv)");
    });
  });

  describe("result identity", () => {
    it("derives ids from item identity, not list position", () => {
      const results = createSearchResults([createMockSection("Env", "export EDITOR=code")]);
      expect(results[0]?.id).toBe("export:Env:EDITOR");

      // An item added above must not change the existing item's id
      const shifted = createSearchResults([createMockSection("Env", "export AAA=1\nexport EDITOR=code")]);
      expect(shifted.find((r) => r.name === "EDITOR")?.id).toBe("export:Env:EDITOR");
    });

    it("assigns per-instance identity when two sections share a label", () => {
      const results = createSearchResults([
        createMockSection("Env", "export EDITOR=code"),
        createMockSection("Env", "export EDITOR=vim"),
      ]);
      const [first, second] = results;
      expect(first?.sectionOccurrence).toBe(0);
      expect(second?.sectionOccurrence).toBe(1);
      // ids stay unique
      expect(first?.id).not.toBe(second?.id);
    });

    it("disambiguates duplicate names within a section", () => {
      const results = createSearchResults([createMockSection("Env", "export EDITOR=code\nexport EDITOR=vim")]);
      const ids = results.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("filterResults", () => {
    it("does not match secret values typed into search", () => {
      const results = createSearchResults([
        createMockSection("Env", "export GITHUB_TOKEN=fake-value-for-tests\nexport EDITOR=code"),
      ]);
      expect(filterResults(results, "fake-value")).toHaveLength(0);
      // Non-secret values stay searchable
      expect(filterResults(results, "code")).toHaveLength(1);
      // Secret names stay searchable
      expect(filterResults(results, "github_token")).toHaveLength(1);
    });

    it("filters by keyword and returns everything for empty search", () => {
      const results = createSearchResults([createMockSection("A", "alias ll='ls -la'\nexport EDITOR=code")]);
      expect(filterResults(results, "ll")).toHaveLength(1);
      expect(filterResults(results, "")).toHaveLength(2);
      expect(filterResults(results, "EDITOR")).toHaveLength(1);
    });
  });

  describe("groupResultsByType", () => {
    it("groups results by their type", () => {
      const results = createSearchResults([createMockSection("A", "alias ll='ls -la'\nexport EDITOR=code")]);
      const groups = groupResultsByType(results);
      expect(groups.get("alias")).toHaveLength(1);
      expect(groups.get("export")).toHaveLength(1);
    });
  });

  describe("getTypeDisplayName", () => {
    it("maps known types and passes through unknown ones", () => {
      expect(getTypeDisplayName("alias")).toBe("Aliases");
      expect(getTypeDisplayName("setopt")).toBe("Setopts");
      expect(getTypeDisplayName("mystery")).toBe("mystery");
    });
  });

  describe("SearchResultListItem", () => {
    const sections = [createMockSection("Env", "export GITHUB_TOKEN=fake-value-for-tests\nexport EDITOR=code")];
    const [secretResult, plainResult] = createSearchResults(sections);

    it("masks a secret value until revealed", () => {
      render(
        <SearchResultListItem result={secretResult!} refresh={() => {}} revealed={false} onToggleReveal={() => {}} />,
      );

      expect(screen.getByText("GITHUB_TOKEN")).toBeInTheDocument();
      expect(screen.getByText("fak•••••sts")).toBeInTheDocument();
      expect(screen.queryByText("fake-value-for-tests")).not.toBeInTheDocument();
      expect(screen.getByText("Reveal Value")).toBeInTheDocument();
    });

    it("shows the real value when revealed", () => {
      render(
        <SearchResultListItem result={secretResult!} refresh={() => {}} revealed={true} onToggleReveal={() => {}} />,
      );

      expect(screen.getByText("fake-value-for-tests")).toBeInTheDocument();
      expect(screen.getByText("Hide Value")).toBeInTheDocument();
    });

    it("exposes the full action set on an export result", () => {
      render(
        <SearchResultListItem result={plainResult!} refresh={() => {}} revealed={false} onToggleReveal={() => {}} />,
      );

      expect(screen.getByText("Edit Export")).toBeInTheDocument();
      expect(screen.getByText("Delete Export")).toBeInTheDocument();
      expect(screen.getByText("Copy Value")).toBeInTheDocument();
      expect(screen.getByText("Copy Name")).toBeInTheDocument();
      expect(screen.getByText("Copy Definition")).toBeInTheDocument();
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    it("omits edit and delete for types without editors", () => {
      const [setopt] = createSearchResults([createMockSection("Options", "setopt autocd")]);
      render(<SearchResultListItem result={setopt!} refresh={() => {}} revealed={false} onToggleReveal={() => {}} />);

      expect(screen.queryByText("Edit Export")).not.toBeInTheDocument();
      expect(screen.queryByText("Delete Export")).not.toBeInTheDocument();
      expect(screen.getByText("Copy Value")).toBeInTheDocument();
      expect(screen.getByText("Copy Name")).toBeInTheDocument();
    });
  });
});
