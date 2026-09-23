/**
 * Regression tests for large-config handling.
 *
 * readZshrcFile used to truncate content at 10,000 characters, which silently
 * dropped everything past 10 KB from every browse view, made counts and
 * duplicate detection wrong, and caused the backup diff to report spurious
 * deletions. writeZshrcFile used to hard-fail on any line over 1,000
 * characters, permanently blocking saves for configs with a long pre-existing
 * line. These tests exercise the real sanitize/parse/diff code (only fs and
 * the Raycast API are mocked).
 */

import { readFile, writeFile, stat, rename, lstat, access } from "fs/promises";
import { vi } from "vitest";
import { confirmAlert } from "@raycast/api";
import { readZshrcFile, writeZshrcFile } from "../lib/zsh";
import { parseAliases, parseExports } from "../utils/parsers";
import { computeDiff } from "../utils/diff";

vi.mock("fs/promises");

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockStat = vi.mocked(stat);
const mockRename = vi.mocked(rename);
const mockLstat = vi.mocked(lstat);
const mockAccess = vi.mocked(access);
const mockConfirmAlert = vi.mocked(confirmAlert);

const ALIAS_COUNT = 60;
const EXPORT_COUNT = 60;

/** Builds a realistic config comfortably over 20 KB. */
function buildLargeConfig(): string {
  const lines: string[] = ["# Section: Generated"];
  for (let i = 0; i < ALIAS_COUNT; i++) {
    lines.push(`# Alias number ${i} with a descriptive comment to add bulk to the file`);
    lines.push(`alias generated_alias_${i}='echo "alias ${i} with some padding padding padding padding"'`);
  }
  for (let i = 0; i < EXPORT_COUNT; i++) {
    lines.push(`# Export number ${i} with a descriptive comment to add bulk to the file`);
    lines.push(`export GENERATED_VAR_${i}="value-${i}-${"x".repeat(80)}"`);
  }
  return lines.join("\n");
}

describe("large config handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmAlert.mockResolvedValue(true);
  });

  it("readZshrcFile returns a >20 KB config in full and all items parse", async () => {
    const content = buildLargeConfig();
    expect(content.length).toBeGreaterThan(20000);

    mockAccess.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ size: content.length } as never);
    mockReadFile.mockResolvedValue(content);

    const result = await readZshrcFile();

    expect(result).toBe(content);
    expect(parseAliases(result)).toHaveLength(ALIAS_COUNT);
    expect(parseExports(result)).toHaveLength(EXPORT_COUNT);
  });

  it("backup diff over a >10 KB unchanged config reports no spurious deletions", async () => {
    const content = buildLargeConfig();

    mockAccess.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ size: content.length } as never);
    mockReadFile.mockResolvedValue(content);

    const current = await readZshrcFile();
    const diff = computeDiff(content, current);

    expect(diff.hasChanges).toBe(false);
    expect(diff.deletions).toBe(0);
    expect(diff.additions).toBe(0);
  });

  it("a config containing a >1000-character line saves after confirmation", async () => {
    const content = `export PATH=${"/some/long/dir:".repeat(90)}$PATH\nalias ll='ls -la'`;
    expect(content.split("\n")[0]!.length).toBeGreaterThan(1000);

    mockAccess.mockResolvedValue(undefined);
    mockLstat.mockRejectedValue(new Error("no file"));
    mockStat.mockRejectedValue(new Error("no file"));
    mockWriteFile.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined as never);

    await expect(writeZshrcFile(content)).resolves.toBeUndefined();

    expect(mockConfirmAlert).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("too long") }),
    );
    expect(mockWriteFile).toHaveBeenCalled();
    expect(mockRename).toHaveBeenCalled();
  });
});
