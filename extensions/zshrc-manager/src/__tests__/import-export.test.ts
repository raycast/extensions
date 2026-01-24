/**
 * Tests for import-export.ts - Import/Export functionality for zshrc entries
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { Clipboard, showToast, Toast } from "@raycast/api";

// Mock dependencies before importing the module
vi.mock("@raycast/api");
vi.mock("../lib/zsh", () => ({
  readZshrcFileRaw: vi.fn(),
  writeZshrcFile: vi.fn(),
  getZshrcPath: vi.fn(),
}));
vi.mock("../lib/cache", () => ({
  clearCache: vi.fn(),
}));
vi.mock("../lib/history", () => ({
  saveToHistory: vi.fn(),
}));

import {
  exportAliasesToJson,
  exportExportsToJson,
  importAliasesFromJson,
  importExportsFromJson,
  validateImportJson,
} from "../lib/import-export";
import { readZshrcFileRaw, writeZshrcFile, getZshrcPath } from "../lib/zsh";
import { clearCache } from "../lib/cache";
import { saveToHistory } from "../lib/history";

const mockClipboard = vi.mocked(Clipboard);
const mockShowToast = vi.mocked(showToast);
const mockReadZshrcFileRaw = vi.mocked(readZshrcFileRaw);
const mockWriteZshrcFile = vi.mocked(writeZshrcFile);
const mockGetZshrcPath = vi.mocked(getZshrcPath);
const mockClearCache = vi.mocked(clearCache);
const mockSaveToHistory = vi.mocked(saveToHistory);

describe("import-export.ts", () => {
  const TEST_PATH = "/Users/test/.zshrc";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetZshrcPath.mockReturnValue(TEST_PATH);
    mockWriteZshrcFile.mockResolvedValue(undefined);
    mockSaveToHistory.mockResolvedValue(true);
    mockShowToast.mockResolvedValue({} as unknown as Toast);
    mockClipboard.copy.mockResolvedValue(undefined);
    mockReadZshrcFileRaw.mockResolvedValue("# Existing content\nalias existing='test'");
  });

  describe("exportAliasesToJson", () => {
    it("should export aliases to JSON format", async () => {
      const aliases = [
        { name: "ll", command: "ls -la" },
        { name: "gs", command: "git status" },
      ];

      const result = await exportAliasesToJson(aliases);

      const parsed = JSON.parse(result);
      expect(parsed.version).toBe(1);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.aliases).toHaveLength(2);
      expect(parsed.aliases[0].name).toBe("ll");
      expect(parsed.aliases[0].command).toBe("ls -la");
    });

    it("should copy JSON to clipboard", async () => {
      const aliases = [{ name: "test", command: "echo test" }];

      await exportAliasesToJson(aliases);

      expect(mockClipboard.copy).toHaveBeenCalled();
    });

    it("should show success toast", async () => {
      const aliases = [
        { name: "a", command: "b" },
        { name: "c", command: "d" },
      ];

      await exportAliasesToJson(aliases);

      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Aliases Exported",
        message: "2 aliases copied to clipboard",
      });
    });

    it("should handle empty alias array", async () => {
      const result = await exportAliasesToJson([]);

      const parsed = JSON.parse(result);
      expect(parsed.aliases).toHaveLength(0);
    });

    it("should handle aliases with special characters", async () => {
      const aliases = [{ name: "test", command: "echo 'hello \"world\"'" }];

      const result = await exportAliasesToJson(aliases);

      const parsed = JSON.parse(result);
      expect(parsed.aliases[0].command).toBe("echo 'hello \"world\"'");
    });
  });

  describe("exportExportsToJson", () => {
    it("should export environment variables to JSON format", async () => {
      const exports = [
        { variable: "PATH", value: "/usr/bin:$PATH" },
        { variable: "EDITOR", value: "vim" },
      ];

      const result = await exportExportsToJson(exports);

      const parsed = JSON.parse(result);
      expect(parsed.version).toBe(1);
      expect(parsed.exports).toHaveLength(2);
      expect(parsed.exports[0].variable).toBe("PATH");
      expect(parsed.exports[0].value).toBe("/usr/bin:$PATH");
    });

    it("should copy JSON to clipboard", async () => {
      const exports = [{ variable: "TEST", value: "value" }];

      await exportExportsToJson(exports);

      expect(mockClipboard.copy).toHaveBeenCalled();
    });

    it("should show success toast", async () => {
      const exports = [
        { variable: "A", value: "B" },
        { variable: "C", value: "D" },
        { variable: "E", value: "F" },
      ];

      await exportExportsToJson(exports);

      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Exports Exported",
        message: "3 exports copied to clipboard",
      });
    });
  });

  describe("importAliasesFromJson", () => {
    it("should import aliases from JSON", async () => {
      const json = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: [
          { name: "ll", command: "ls -la" },
          { name: "gs", command: "git status" },
        ],
      });

      const count = await importAliasesFromJson(json);

      expect(count).toBe(2);
      expect(mockWriteZshrcFile).toHaveBeenCalled();
      expect(mockSaveToHistory).toHaveBeenCalledWith("Import 2 aliases");
    });

    it("should add section header when specified", async () => {
      const json = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: [{ name: "test", command: "echo" }],
      });

      await importAliasesFromJson(json, "Imported Aliases");

      const calls = mockWriteZshrcFile.mock.calls;
      expect(calls[0]).toBeDefined();
      const writeCall = calls[0]![0];
      expect(writeCall).toContain("# --- Imported Aliases ---");
    });

    it("should append aliases to end of file", async () => {
      mockReadZshrcFileRaw.mockResolvedValue("# Existing content\n");

      const json = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: [{ name: "new", command: "cmd" }],
      });

      await importAliasesFromJson(json);

      const calls = mockWriteZshrcFile.mock.calls;
      expect(calls[0]).toBeDefined();
      const writeCall = calls[0]![0];
      expect(writeCall).toContain("# Existing content");
      expect(writeCall).toContain("alias new='cmd'");
    });

    it("should escape single quotes in commands", async () => {
      const json = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: [{ name: "test", command: "echo 'hello'" }],
      });

      await importAliasesFromJson(json);

      const calls = mockWriteZshrcFile.mock.calls;
      expect(calls[0]).toBeDefined();
      const writeCall = calls[0]![0];
      expect(writeCall).toContain("'\"'\"'");
    });

    it("should throw error for unsupported version", async () => {
      const json = JSON.stringify({
        version: 2,
        aliases: [{ name: "test", command: "cmd" }],
      });

      await expect(importAliasesFromJson(json)).rejects.toThrow("Unsupported export format version");
    });

    it("should throw error when no aliases found", async () => {
      const json = JSON.stringify({
        version: 1,
        aliases: [],
      });

      await expect(importAliasesFromJson(json)).rejects.toThrow("No aliases found in import data");
    });

    it("should throw error for missing aliases field", async () => {
      const json = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
      });

      await expect(importAliasesFromJson(json)).rejects.toThrow("No aliases found in import data");
    });

    it("should show failure toast on error", async () => {
      const json = "invalid json";

      await expect(importAliasesFromJson(json)).rejects.toThrow();

      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Import Failed",
        message: expect.any(String),
      });
    });

    it("should clear cache after import", async () => {
      const json = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: [{ name: "test", command: "cmd" }],
      });

      await importAliasesFromJson(json);

      expect(mockClearCache).toHaveBeenCalledWith(TEST_PATH);
    });
  });

  describe("importExportsFromJson", () => {
    it("should import exports from JSON", async () => {
      const json = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        exports: [
          { variable: "PATH", value: "/usr/bin" },
          { variable: "EDITOR", value: "vim" },
        ],
      });

      const count = await importExportsFromJson(json);

      expect(count).toBe(2);
      expect(mockWriteZshrcFile).toHaveBeenCalled();
    });

    it("should add section header when specified", async () => {
      const json = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        exports: [{ variable: "TEST", value: "value" }],
      });

      await importExportsFromJson(json, "Environment Variables");

      const calls = mockWriteZshrcFile.mock.calls;
      expect(calls[0]).toBeDefined();
      const writeCall = calls[0]![0];
      expect(writeCall).toContain("# --- Environment Variables ---");
    });

    it("should escape double quotes in values", async () => {
      const json = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        exports: [{ variable: "TEST", value: 'hello "world"' }],
      });

      await importExportsFromJson(json);

      const calls = mockWriteZshrcFile.mock.calls;
      expect(calls[0]).toBeDefined();
      const writeCall = calls[0]![0];
      expect(writeCall).toContain('\\"');
    });

    it("should throw error for unsupported version", async () => {
      const json = JSON.stringify({
        version: 99,
        exports: [{ variable: "TEST", value: "value" }],
      });

      await expect(importExportsFromJson(json)).rejects.toThrow("Unsupported export format version");
    });

    it("should throw error when no exports found", async () => {
      const json = JSON.stringify({
        version: 1,
        exports: [],
      });

      await expect(importExportsFromJson(json)).rejects.toThrow("No exports found in import data");
    });
  });

  describe("validateImportJson", () => {
    it("should validate correct JSON with aliases", () => {
      const json = JSON.stringify({
        version: 1,
        aliases: [{ name: "test", command: "cmd" }],
      });

      const result = validateImportJson(json);

      expect(result.valid).toBe(true);
      expect(result.aliasCount).toBe(1);
      expect(result.exportCount).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it("should validate correct JSON with exports", () => {
      const json = JSON.stringify({
        version: 1,
        exports: [
          { variable: "A", value: "B" },
          { variable: "C", value: "D" },
        ],
      });

      const result = validateImportJson(json);

      expect(result.valid).toBe(true);
      expect(result.aliasCount).toBe(0);
      expect(result.exportCount).toBe(2);
    });

    it("should validate JSON with both aliases and exports", () => {
      const json = JSON.stringify({
        version: 1,
        aliases: [{ name: "test", command: "cmd" }],
        exports: [{ variable: "VAR", value: "val" }],
      });

      const result = validateImportJson(json);

      expect(result.valid).toBe(true);
      expect(result.aliasCount).toBe(1);
      expect(result.exportCount).toBe(1);
    });

    it("should return invalid for unsupported version", () => {
      const json = JSON.stringify({
        version: 2,
        aliases: [{ name: "test", command: "cmd" }],
      });

      const result = validateImportJson(json);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Unsupported version");
    });

    it("should return invalid for invalid JSON", () => {
      const result = validateImportJson("not valid json");

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return counts of 0 for empty arrays", () => {
      const json = JSON.stringify({
        version: 1,
        aliases: [],
        exports: [],
      });

      const result = validateImportJson(json);

      expect(result.valid).toBe(true);
      expect(result.aliasCount).toBe(0);
      expect(result.exportCount).toBe(0);
    });

    it("should handle missing arrays", () => {
      const json = JSON.stringify({
        version: 1,
      });

      const result = validateImportJson(json);

      expect(result.valid).toBe(true);
      expect(result.aliasCount).toBe(0);
      expect(result.exportCount).toBe(0);
    });
  });
});
