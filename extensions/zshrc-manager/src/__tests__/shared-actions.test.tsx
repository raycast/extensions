import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SharedActionsSection } from "../lib/shared-actions";
import { Clipboard } from "@raycast/api";

vi.mock("../lib/zsh", () => ({
  getZshrcPath: vi.fn(() => "/test/.zshrc"),
  getBackupPath: vi.fn(() => "/test/.zshrc.backup"),
  restoreFromBackup: vi.fn(),
}));

vi.mock("../lib/history", () => ({
  undoLastChange: vi.fn(),
  getHistory: vi.fn(async () => []),
  getUndoCount: vi.fn(async () => 0),
  saveToHistory: vi.fn(),
}));

vi.mock("../lib/cache", () => ({
  clearCache: vi.fn(),
}));

describe("SharedActionsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders only the tools section without item actions", () => {
    render(<SharedActionsSection onRefresh={() => {}} />);

    expect(screen.getByText("Tools")).toBeInTheDocument();
    expect(screen.queryByText("Item")).not.toBeInTheDocument();
    expect(screen.queryByText("Copy Value")).not.toBeInTheDocument();
  });

  it("renders the full action set when item actions are provided", () => {
    render(
      <SharedActionsSection
        onRefresh={() => {}}
        item={{
          editTitle: "Edit Export",
          editTarget: <div>edit form</div>,
          deleteTitle: "Delete Export",
          onDelete: () => {},
          copyName: "OPENAI_API_KEY",
          copyValue: "sk-abcdefghijklmnop",
          copyDefinition: 'export OPENAI_API_KEY="sk-abcdefghijklmnop"',
          isSecret: true,
          revealed: false,
          onToggleReveal: () => {},
        }}
      />,
    );

    expect(screen.getByText("Edit Export")).toBeInTheDocument();
    expect(screen.getByText("Delete Export")).toBeInTheDocument();
    expect(screen.getByText("Copy Value")).toBeInTheDocument();
    expect(screen.getByText("Copy Name")).toBeInTheDocument();
    expect(screen.getByText("Copy Definition")).toBeInTheDocument();
    expect(screen.getByText("Reveal Value")).toBeInTheDocument();
    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });

  it("titles the reveal action Hide Value once revealed", () => {
    render(
      <SharedActionsSection
        onRefresh={() => {}}
        item={{ copyValue: "v", isSecret: true, revealed: true, onToggleReveal: () => {} }}
      />,
    );

    expect(screen.getByText("Hide Value")).toBeInTheDocument();
    expect(screen.queryByText("Reveal Value")).not.toBeInTheDocument();
  });

  it("copies the real value even when the item is masked as a secret", async () => {
    render(
      <SharedActionsSection
        onRefresh={() => {}}
        item={{
          copyName: "GITHUB_TOKEN",
          copyValue: "fake-real-value-123",
          isSecret: true,
          revealed: false,
          onToggleReveal: () => {},
        }}
      />,
    );

    fireEvent.click(screen.getByText("Copy Value"));
    await waitFor(() => {
      expect(Clipboard.copy).toHaveBeenCalledWith("fake-real-value-123", { concealed: true });
    });
  });

  it("copies the name via Copy Name", async () => {
    render(<SharedActionsSection onRefresh={() => {}} item={{ copyName: "GITHUB_TOKEN", copyValue: "x" }} />);

    fireEvent.click(screen.getByText("Copy Name"));
    await waitFor(() => {
      expect(Clipboard.copy).toHaveBeenCalledWith("GITHUB_TOKEN");
    });
  });

  it("invokes the delete handler", async () => {
    const onDelete = vi.fn();
    render(<SharedActionsSection onRefresh={() => {}} item={{ onDelete, copyValue: "x" }} />);

    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled();
    });
  });

  it("toggles reveal via the reveal action", () => {
    const onToggleReveal = vi.fn();
    render(
      <SharedActionsSection
        onRefresh={() => {}}
        item={{ copyValue: "x", isSecret: true, revealed: false, onToggleReveal }}
      />,
    );

    fireEvent.click(screen.getByText("Reveal Value"));
    expect(onToggleReveal).toHaveBeenCalled();
  });

  it("omits edit and delete when the item cannot be edited", () => {
    render(<SharedActionsSection onRefresh={() => {}} item={{ copyName: "autocd", copyValue: "autocd" }} />);

    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    expect(screen.getByText("Copy Value")).toBeInTheDocument();
    expect(screen.getByText("Copy Name")).toBeInTheDocument();
  });
});
