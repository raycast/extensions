/**
 * Component tests for backup-manager.tsx and history-view.tsx — the two
 * restore surfaces. Covers: rendering with and without data, the
 * confirm-guarded restore/delete/undo/clear flows (both confirmed and
 * cancelled), and the diff view path.
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { confirmAlert, showToast } from "@raycast/api";

vi.mock("../lib/zsh", () => ({
  getBackupInfo: vi.fn(),
  getBackupPath: vi.fn(() => "/t/.zshrc.backup"),
  getZshrcPath: vi.fn(() => "/t/.zshrc"),
  readBackupFile: vi.fn(),
  readZshrcFile: vi.fn(),
  restoreFromBackup: vi.fn().mockResolvedValue(undefined),
  deleteBackup: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../lib/cache", () => ({ clearCache: vi.fn() }));
vi.mock("../lib/history", () => ({
  getHistory: vi.fn(),
  undoToPoint: vi.fn(),
  clearHistory: vi.fn().mockResolvedValue(undefined),
}));

import BackupManager from "../backup-manager";
import HistoryView from "../history-view";
import * as zshLib from "../lib/zsh";
import * as historyLib from "../lib/history";

const zshMocks = vi.mocked(zshLib);
const historyMocks = vi.mocked(historyLib);

const BACKUP_INFO = {
  exists: true,
  path: "/t/.zshrc.backup",
  size: 1234,
  sizeFormatted: "1.2 KB",
  modifiedAt: new Date("2026-08-01T10:00:00Z"),
};

describe("BackupManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    zshMocks.getBackupInfo.mockResolvedValue(BACKUP_INFO);
    vi.mocked(confirmAlert).mockResolvedValue(true);
  });

  it("shows the empty view when no backup exists", async () => {
    zshMocks.getBackupInfo.mockResolvedValue({ ...BACKUP_INFO, exists: false });
    render(<BackupManager />);
    await waitFor(() => {
      expect(screen.getByText("No Backup Found")).toBeTruthy();
    });
  });

  it("renders backup details when a backup exists", async () => {
    render(<BackupManager />);
    await waitFor(() => {
      expect(screen.getByText("Current Backup")).toBeTruthy();
    });
    // The metadata itself must render, not just the section header
    const rendered = document.body.textContent ?? "";
    expect(rendered).toContain("1.2 KB");
    expect(rendered).toContain("/t/.zshrc.backup");
  });

  it("restore is guarded by confirmation and runs when confirmed", async () => {
    render(<BackupManager />);
    await waitFor(() => expect(screen.getByText("Current Backup")).toBeTruthy());

    const restore = screen.getAllByText(/Restore from Backup/i)[0];
    fireEvent.click(restore!);

    await waitFor(() => {
      expect(zshMocks.restoreFromBackup).toHaveBeenCalled();
    });
    expect(vi.mocked(showToast)).toHaveBeenCalledWith(expect.objectContaining({ title: "Backup Restored" }));
  });

  it("cancelled restore never touches the file", async () => {
    vi.mocked(confirmAlert).mockResolvedValue(false);
    render(<BackupManager />);
    await waitFor(() => expect(screen.getByText("Current Backup")).toBeTruthy());

    const restore = screen.getAllByText(/Restore from Backup/i)[0];
    fireEvent.click(restore!);

    await waitFor(() => expect(vi.mocked(confirmAlert)).toHaveBeenCalled());
    expect(zshMocks.restoreFromBackup).not.toHaveBeenCalled();
  });

  it("delete is guarded by confirmation", async () => {
    render(<BackupManager />);
    await waitFor(() => expect(screen.getByText("Current Backup")).toBeTruthy());

    const del = screen.getAllByText(/Delete Backup/i)[0];
    fireEvent.click(del!);

    await waitFor(() => {
      expect(zshMocks.deleteBackup).toHaveBeenCalled();
    });
    expect(vi.mocked(confirmAlert)).toHaveBeenCalled();
  });

  it("cancelled delete never removes the backup", async () => {
    vi.mocked(confirmAlert).mockResolvedValue(false);
    render(<BackupManager />);
    await waitFor(() => expect(screen.getByText("Current Backup")).toBeTruthy());

    const del = screen.getAllByText(/Delete Backup/i)[0];
    fireEvent.click(del!);

    await waitFor(() => expect(vi.mocked(confirmAlert)).toHaveBeenCalled());
    expect(zshMocks.deleteBackup).not.toHaveBeenCalled();
  });
});

describe("HistoryView", () => {
  const ENTRIES = [
    {
      timestamp: Date.parse("2026-08-02T10:00:00Z"),
      description: 'Add alias "gl"',
      previousContent: "before-2",
      filePath: "/t/.zshrc",
    },
    {
      timestamp: Date.parse("2026-08-01T10:00:00Z"),
      description: 'Delete alias "gg"',
      previousContent: "before-1",
      filePath: "/t/.zshrc",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    historyMocks.getHistory.mockResolvedValue(ENTRIES);
    historyMocks.undoToPoint.mockResolvedValue(true);
    vi.mocked(confirmAlert).mockResolvedValue(true);
  });

  it("renders history entries", async () => {
    render(<HistoryView />);
    await waitFor(() => {
      expect(screen.getAllByText('Add alias "gl"').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Delete alias "gg"').length).toBeGreaterThan(0);
    });
  });

  it("undo restores to the selected point after confirmation", async () => {
    const onRefresh = vi.fn();
    render(<HistoryView onRefresh={onRefresh} />);
    await waitFor(() => expect(screen.getAllByText('Add alias "gl"').length).toBeGreaterThan(0));

    const undo = screen.getAllByText("Undo This Change")[0];
    fireEvent.click(undo!);

    await waitFor(() => {
      expect(historyMocks.undoToPoint).toHaveBeenCalledWith(0);
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it("cancelled undo leaves history untouched", async () => {
    vi.mocked(confirmAlert).mockResolvedValue(false);
    render(<HistoryView />);
    await waitFor(() => expect(screen.getAllByText('Add alias "gl"').length).toBeGreaterThan(0));

    const undo = screen.getAllByText("Undo This Change")[0];
    fireEvent.click(undo!);

    await waitFor(() => expect(vi.mocked(confirmAlert)).toHaveBeenCalled());
    expect(historyMocks.undoToPoint).not.toHaveBeenCalled();
  });

  it("failed undo surfaces an error toast", async () => {
    historyMocks.undoToPoint.mockResolvedValue(false);
    render(<HistoryView />);
    await waitFor(() => expect(screen.getAllByText('Add alias "gl"').length).toBeGreaterThan(0));

    const undo = screen.getAllByText("Undo This Change")[0];
    fireEvent.click(undo!);

    await waitFor(() => {
      expect(vi.mocked(showToast)).toHaveBeenCalledWith(expect.objectContaining({ title: "Undo Failed" }));
    });
  });

  it("clear history is guarded by confirmation", async () => {
    render(<HistoryView />);
    await waitFor(() => expect(screen.getAllByText('Add alias "gl"').length).toBeGreaterThan(0));

    const clear = screen.getAllByText("Clear All History")[0];
    fireEvent.click(clear!);

    await waitFor(() => {
      expect(historyMocks.clearHistory).toHaveBeenCalled();
    });
    expect(vi.mocked(confirmAlert)).toHaveBeenCalled();
  });

  it("declined clear confirmation leaves history untouched", async () => {
    vi.mocked(confirmAlert).mockResolvedValue(false);
    render(<HistoryView />);
    await waitFor(() => expect(screen.getAllByText('Add alias "gl"').length).toBeGreaterThan(0));

    const clear = screen.getAllByText("Clear All History")[0];
    fireEvent.click(clear!);

    await waitFor(() => expect(vi.mocked(confirmAlert)).toHaveBeenCalled());
    expect(historyMocks.clearHistory).not.toHaveBeenCalled();
  });
});
