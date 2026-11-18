/**
 * Component tests for lib/edit-item-preview.tsx — the diff preview must
 * show exactly what a save would write, the guidance states when fields
 * are missing, and the error state on fail-closed refusals.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiffPreviewView } from "../lib/edit-item-preview";
import type { EditItemConfig } from "../lib/edit-item-write";

const mockReadRaw = vi.fn();
vi.mock("../lib/zsh", () => ({
  readZshrcFileRaw: (...args: unknown[]) => mockReadRaw(...args),
}));

const aliasConfig: EditItemConfig = {
  keyLabel: "Alias Name",
  valueLabel: "Command",
  keyPlaceholder: "",
  valuePlaceholder: "",
  keyPattern: /^[A-Za-z0-9_.:-]+$/,
  keyValidationError: "Invalid",
  generateLine: (key, value) => `alias ${key}='${value}'`,
  generatePattern: (key) => new RegExp(`^(\\s*)alias\\s+${key}=(?:'|")(.*?)(?:'|")(\\s*#.*)?$`),
  generateReplacement: (key, value) => `alias ${key}='${value}'`,
  matchesDisplayLine: (line, key) => new RegExp(`^\\s*alias\\s+${key}=`).test(line),
  itemType: "alias",
  itemTypeCapitalized: "Alias",
};

const FILE = ["# Section: Tools", "alias gg='git grep'"].join("\n");

const baseProps = {
  currentKey: "gl",
  currentValue: "git log",
  currentSection: "Tools",
  newSectionName: "",
  config: aliasConfig,
  isEditing: false,
};

describe("DiffPreviewView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadRaw.mockResolvedValue(FILE);
  });

  it("renders the additive diff for a new item", async () => {
    render(<DiffPreviewView {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByTestId("detail").textContent).toContain("Preview: Add Alias");
    });
    expect(screen.getByTestId("detail").textContent).toContain("alias gl='git log'");
  });

  it("asks for both fields before previewing", async () => {
    render(<DiffPreviewView {...baseProps} currentValue="" />);
    await waitFor(() => {
      expect(screen.getByTestId("detail").textContent).toContain("Preview Not Available");
    });
    expect(mockReadRaw).not.toHaveBeenCalled();
  });

  it("asks for a section name when New Section is selected without one", async () => {
    render(<DiffPreviewView {...baseProps} currentSection="New Section" newSectionName="" />);
    await waitFor(() => {
      expect(screen.getByTestId("detail").textContent).toContain("name for the new section");
    });
  });

  it("reports No Changes when the values match the file", async () => {
    render(
      <DiffPreviewView
        {...baseProps}
        isEditing={true}
        existingKey="gg"
        currentKey="gg"
        currentValue="git grep"
        originalSection="Tools"
        sectionOccurrence={0}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("detail").textContent).toContain("No Changes");
    });
  });

  it("surfaces the fail-closed message when the target is ambiguous", async () => {
    mockReadRaw.mockResolvedValue(["# Section: Tools", "alias gg='one'", "alias gg='two'"].join("\n"));
    render(
      <DiffPreviewView
        {...baseProps}
        isEditing={true}
        existingKey="gg"
        currentKey="gg"
        currentValue="three"
        originalSection="Tools"
        sectionOccurrence={0}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("detail").textContent).toContain("Error Generating Preview");
    });
    expect(screen.getByTestId("detail").textContent).toContain("Multiple definitions");
  });
});
