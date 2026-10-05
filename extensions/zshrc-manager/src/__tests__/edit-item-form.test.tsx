/**
 * Component tests for lib/edit-item-form.tsx — the create, edit,
 * validation-warning confirm, cancel, and delete flows, exercised through
 * the submit handler with the write layer mocked. The diff preview is
 * covered in edit-item-preview.test.tsx.
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { confirmAlert, showToast, Toast, useNavigation } from "@raycast/api";
import type { EditItemConfig } from "../lib/edit-item-write";

const mockReadRaw = vi.fn();
const mockWrite = vi.fn();
const mockReadPretty = vi.fn();
vi.mock("../lib/zsh", () => ({
  readZshrcFileRaw: (...args: unknown[]) => mockReadRaw(...args),
  writeZshrcFile: (...args: unknown[]) => mockWrite(...args),
  readZshrcFile: (...args: unknown[]) => mockReadPretty(...args),
  checkZshrcAccess: vi.fn().mockResolvedValue({ path: "/t/.zshrc", exists: true, readable: true, writable: true }),
  getZshrcPath: vi.fn(() => "/t/.zshrc"),
}));
vi.mock("../lib/cache", () => ({ clearCache: vi.fn() }));
vi.mock("../lib/history", () => ({ saveToHistory: vi.fn().mockResolvedValue(undefined) }));

// Capture useForm wiring so submits can be driven directly.
// Known tradeoff: driving capturedOnSubmit couples these tests to useForm
// as the form-management approach — accepted because Raycast's real Form
// cannot run outside the app; the delete flow below goes through the
// rendered Action button instead.
let capturedOnSubmit: ((values: Record<string, string>) => Promise<void>) | undefined;
vi.mock("@raycast/utils", () => ({
  useForm: vi.fn((options: { onSubmit: (values: Record<string, string>) => Promise<void> }) => {
    capturedOnSubmit = options.onSubmit;
    return {
      itemProps: {
        key: { id: "key", value: "" },
        value: { id: "value", value: "" },
        section: { id: "section", value: "Uncategorized" },
        newSectionName: { id: "newSectionName", value: "" },
      },
      handleSubmit: vi.fn(),
    };
  }),
}));

import EditItemForm from "../lib/edit-item-form";
import { saveToHistory } from "../lib/history";
import { fireEvent, screen } from "@testing-library/react";

const aliasConfig: EditItemConfig = {
  keyLabel: "Alias Name",
  valueLabel: "Command",
  keyPlaceholder: "e.g., ll",
  valuePlaceholder: "e.g., ls -la",
  keyPattern: /^[A-Za-z0-9_.:-]+$/,
  keyValidationError: "Invalid alias name",
  generateLine: (key, value) => `alias ${key}='${value}'`,
  generatePattern: (key) => new RegExp(`^(\\s*)alias\\s+${key}=(?:'|")(.*?)(?:'|")(\\s*#.*)?$`),
  generateReplacement: (key, value) => `alias ${key}='${value}'`,
  matchesDisplayLine: (line, key) => new RegExp(`^\\s*alias\\s+${key}=(?:'|")(.*?)(?:'|")\\s*(#.*)?$`).test(line),
  itemType: "alias",
  itemTypeCapitalized: "Alias",
};

const FILE = ["# Section: Tools", "alias gg='git grep'"].join("\n");

const submit = (values: Record<string, string>) => capturedOnSubmit!(values);

describe("EditItemForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnSubmit = undefined;
    mockReadPretty.mockResolvedValue(FILE);
    mockReadRaw.mockResolvedValue(FILE);
    // Write verification re-reads: return whatever was last written
    mockWrite.mockImplementation(async (content: string) => {
      mockReadRaw.mockResolvedValue(content);
    });
    vi.mocked(confirmAlert).mockResolvedValue(true);
  });

  it("create flow writes the new definition into the target section", async () => {
    render(<EditItemForm config={aliasConfig} />);
    await submit({ key: "gl", value: "git log", section: "Tools", newSectionName: "" });

    expect(mockWrite).toHaveBeenCalledTimes(1);
    const written = mockWrite.mock.calls[0]![0] as string;
    expect(written).toContain("alias gl='git log'");
    expect(written).toContain("alias gg='git grep'");
    expect(vi.mocked(showToast)).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Alias Added", style: Toast.Style.Success }),
    );
  });

  it("edit flow rewrites the existing definition in place", async () => {
    render(
      <EditItemForm
        config={aliasConfig}
        existingKey="gg"
        existingValue="git grep"
        sectionLabel="Tools"
        sectionOccurrence={0}
      />,
    );
    await submit({ key: "gg", value: "rg", section: "Tools", newSectionName: "" });

    const written = mockWrite.mock.calls[0]![0] as string;
    expect(written).toContain("alias gg='rg'");
    expect(written).not.toContain("git grep");
    expect(vi.mocked(showToast)).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Alias Updated", style: Toast.Style.Success }),
    );
  });

  it("missing key or value fails validation without writing", async () => {
    render(<EditItemForm config={aliasConfig} />);
    await submit({ key: "", value: "x", section: "Uncategorized", newSectionName: "" });

    expect(mockWrite).not.toHaveBeenCalled();
    expect(vi.mocked(showToast)).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Validation Error", style: Toast.Style.Failure }),
    );
  });

  it("structural warnings ask for confirmation and cancel aborts the save", async () => {
    vi.mocked(confirmAlert).mockResolvedValue(false);
    render(<EditItemForm config={aliasConfig} />);
    // Unbalanced quote triggers a structural warning
    await submit({ key: "bad", value: "echo 'unclosed", section: "Uncategorized", newSectionName: "" });

    expect(vi.mocked(confirmAlert)).toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it("structural warnings save when the user confirms", async () => {
    vi.mocked(confirmAlert).mockResolvedValue(true);
    render(<EditItemForm config={aliasConfig} />);
    await submit({ key: "bad", value: "echo 'unclosed", section: "Uncategorized", newSectionName: "" });

    expect(vi.mocked(confirmAlert)).toHaveBeenCalled();
    expect(mockWrite).toHaveBeenCalledTimes(1);
  });

  it("New Section without a name is rejected before writing", async () => {
    render(<EditItemForm config={aliasConfig} />);
    await submit({ key: "gl", value: "git log", section: "New Section", newSectionName: "" });

    expect(mockWrite).not.toHaveBeenCalled();
    expect(vi.mocked(showToast)).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Please provide a name for the new section" }),
    );
  });

  it("New Section with a name creates the section", async () => {
    render(<EditItemForm config={aliasConfig} />);
    await submit({ key: "gl", value: "git log", section: "New Section", newSectionName: "Fresh" });

    const written = mockWrite.mock.calls[0]![0] as string;
    expect(written).toContain("# --- Fresh --- #\nalias gl='git log'");
  });

  it("ambiguous duplicates surface the fail-closed error instead of writing", async () => {
    const dup = ["# Section: Tools", "alias gg='one'", "alias gg='two'"].join("\n");
    mockReadRaw.mockResolvedValue(dup);
    render(
      <EditItemForm
        config={aliasConfig}
        existingKey="gg"
        existingValue="one"
        sectionLabel="Tools"
        sectionOccurrence={0}
      />,
    );
    await submit({ key: "gg", value: "three", section: "Tools", newSectionName: "" });

    expect(mockWrite).not.toHaveBeenCalled();
    expect(vi.mocked(showToast)).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Multiple definitions"), style: Toast.Style.Failure }),
    );
  });

  it("write-verification mismatch surfaces an error", async () => {
    // Simulate the file changing between write and verification re-read
    mockWrite.mockImplementation(async () => {
      mockReadRaw.mockResolvedValue("something else entirely");
    });
    render(<EditItemForm config={aliasConfig} />);
    await submit({ key: "gl", value: "git log", section: "Tools", newSectionName: "" });

    expect(vi.mocked(showToast)).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Write verification failed") }),
    );
  });

  it("history records the PRE-change snapshot after a verified write", async () => {
    render(<EditItemForm config={aliasConfig} />);
    await submit({ key: "gl", value: "git log", section: "Tools", newSectionName: "" });

    // The undo target must be the content before this save
    expect(vi.mocked(saveToHistory)).toHaveBeenCalledWith('Add alias "gl"', FILE);
    // And history is only recorded after the write happened
    const writeOrder = mockWrite.mock.invocationCallOrder[0]!;
    const historyOrder = vi.mocked(saveToHistory).mock.invocationCallOrder[0]!;
    expect(historyOrder).toBeGreaterThan(writeOrder);
  });

  it("delete flow (via the rendered action) writes, then records the pre-delete snapshot", async () => {
    render(
      <EditItemForm
        config={aliasConfig}
        existingKey="gg"
        existingValue="git grep"
        sectionLabel="Tools"
        sectionOccurrence={0}
      />,
    );
    fireEvent.click(screen.getAllByText("Delete Alias")[0]!);

    await waitFor(() => {
      expect(mockWrite).toHaveBeenCalledTimes(1);
    });
    const written = mockWrite.mock.calls[0]![0] as string;
    expect(written).not.toContain("alias gg=");
    expect(vi.mocked(saveToHistory)).toHaveBeenCalledWith('Delete alias "gg"', FILE);
    const writeOrder = mockWrite.mock.invocationCallOrder[0]!;
    const historyOrder = vi.mocked(saveToHistory).mock.invocationCallOrder[0]!;
    expect(historyOrder).toBeGreaterThan(writeOrder);
  });

  it("delete write failure surfaces an error and records no history", async () => {
    mockWrite.mockImplementation(async () => {
      mockReadRaw.mockResolvedValue("corrupted");
    });
    render(
      <EditItemForm
        config={aliasConfig}
        existingKey="gg"
        existingValue="git grep"
        sectionLabel="Tools"
        sectionOccurrence={0}
      />,
    );
    fireEvent.click(screen.getAllByText("Delete Alias")[0]!);

    await waitFor(() => {
      expect(vi.mocked(showToast)).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("Write verification failed") }),
      );
    });
    expect(vi.mocked(saveToHistory)).not.toHaveBeenCalled();
  });

  it("successful save invokes onSave and pops navigation", async () => {
    const onSave = vi.fn();
    const pop = vi.fn();
    vi.mocked(useNavigation).mockReturnValue({ pop, push: vi.fn() } as never);

    render(<EditItemForm config={aliasConfig} onSave={onSave} />);
    await submit({ key: "gl", value: "git log", section: "Tools", newSectionName: "" });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
      expect(pop).toHaveBeenCalled();
    });
  });
});
