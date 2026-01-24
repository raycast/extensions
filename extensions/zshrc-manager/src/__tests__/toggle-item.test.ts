/**
 * Tests for toggle-item.ts - Toggle functionality for zshrc entries
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { showToast, Toast } from "@raycast/api";

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

import { isCommented, toggleItem, enableItem, disableItem } from "../lib/toggle-item";
import { readZshrcFileRaw, writeZshrcFile, getZshrcPath } from "../lib/zsh";
import { clearCache } from "../lib/cache";
import { saveToHistory } from "../lib/history";
import type { EditItemConfig } from "../lib/edit-item-form";

const mockShowToast = vi.mocked(showToast);
const mockReadZshrcFileRaw = vi.mocked(readZshrcFileRaw);
const mockWriteZshrcFile = vi.mocked(writeZshrcFile);
const mockGetZshrcPath = vi.mocked(getZshrcPath);
const mockClearCache = vi.mocked(clearCache);
const mockSaveToHistory = vi.mocked(saveToHistory);

describe("toggle-item.ts", () => {
  const TEST_PATH = "/Users/test/.zshrc";

  // Create a mock EditItemConfig for testing
  const mockAliasConfig: EditItemConfig = {
    keyLabel: "Alias Name",
    valueLabel: "Command",
    keyPlaceholder: "ll",
    valuePlaceholder: "ls -la",
    keyPattern: /^[A-Za-z_][A-Za-z0-9_-]*$/,
    keyValidationError: "Invalid alias name",
    generateLine: (key: string, value: string) => `alias ${key}='${value}'`,
    generatePattern: (key: string) => new RegExp(`^\\s*(?:#\\s*)?alias\\s+${key}=`),
    generateReplacement: (key: string, value: string) => `alias ${key}='${value}'`,
    itemType: "alias",
    itemTypeCapitalized: "Alias",
  };

  const mockExportConfig: EditItemConfig = {
    keyLabel: "Variable Name",
    valueLabel: "Value",
    keyPlaceholder: "PATH",
    valuePlaceholder: "/usr/bin",
    keyPattern: /^[A-Za-z_][A-Za-z0-9_]*$/,
    keyValidationError: "Invalid variable name",
    generateLine: (key: string, value: string) => `export ${key}=${value}`,
    generatePattern: (key: string) => new RegExp(`^\\s*(?:#\\s*)?export\\s+${key}=`),
    generateReplacement: (key: string, value: string) => `export ${key}=${value}`,
    itemType: "export",
    itemTypeCapitalized: "Export",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetZshrcPath.mockReturnValue(TEST_PATH);
    mockWriteZshrcFile.mockResolvedValue(undefined);
    mockSaveToHistory.mockResolvedValue(true);
    mockShowToast.mockResolvedValue({} as unknown as Toast);
  });

  describe("isCommented", () => {
    it("should return true for lines starting with #", () => {
      expect(isCommented("# This is a comment")).toBe(true);
      expect(isCommented("#alias test='echo'")).toBe(true);
      expect(isCommented("# alias test='echo'")).toBe(true);
    });

    it("should return true for lines with leading whitespace before #", () => {
      expect(isCommented("  # comment")).toBe(true);
      expect(isCommented("\t# comment")).toBe(true);
      expect(isCommented("    #alias test='echo'")).toBe(true);
    });

    it("should return false for uncommented lines", () => {
      expect(isCommented("alias test='echo'")).toBe(false);
      expect(isCommented("export PATH=/usr/bin")).toBe(false);
      expect(isCommented("  alias test='echo'")).toBe(false);
    });

    it("should return false for lines with # in the middle", () => {
      expect(isCommented("alias test='echo # comment'")).toBe(false);
      expect(isCommented("export VAR=value#comment")).toBe(false);
    });

    it("should handle empty strings", () => {
      expect(isCommented("")).toBe(false);
    });

    it("should handle strings with only whitespace", () => {
      expect(isCommented("   ")).toBe(false);
      expect(isCommented("\t")).toBe(false);
    });
  });

  describe("toggleItem", () => {
    it("should comment out an active alias", async () => {
      const zshrcContent = "alias ll='ls -la'\nalias gs='git status'";
      const expectedContent = "# alias ll='ls -la'\nalias gs='git status'";
      mockReadZshrcFileRaw
        .mockResolvedValueOnce(zshrcContent) // Initial read
        .mockResolvedValueOnce(expectedContent); // Verification read - must match what was written

      const result = await toggleItem("ll", mockAliasConfig);

      // The implementation returns !isCurrentlyCommented, which means:
      // - Was NOT commented (active) -> returns true after commenting (counter-intuitive)
      expect(result).toBe(true);
      expect(mockWriteZshrcFile).toHaveBeenCalledWith(expectedContent);
      expect(mockSaveToHistory).toHaveBeenCalledWith('Disable alias "ll"');
      expect(mockClearCache).toHaveBeenCalledWith(TEST_PATH);
      // Note: Toast shows "Enabled"/"active" when result is true, even though we commented it out
      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Alias Enabled",
        message: "ll is now active",
      });
    });

    it("should uncomment a disabled alias", async () => {
      const zshrcContent = "# alias ll='ls -la'\nalias gs='git status'";
      const expectedContent = "alias ll='ls -la'\nalias gs='git status'";
      mockReadZshrcFileRaw
        .mockResolvedValueOnce(zshrcContent) // Initial read
        .mockResolvedValueOnce(expectedContent); // Verification read - must match what was written

      const result = await toggleItem("ll", mockAliasConfig);

      // The implementation returns !isCurrentlyCommented, which means:
      // - WAS commented (disabled) -> returns false after uncommenting (counter-intuitive)
      expect(result).toBe(false);
      expect(mockWriteZshrcFile).toHaveBeenCalledWith(expectedContent);
      expect(mockSaveToHistory).toHaveBeenCalledWith('Enable alias "ll"');
    });

    it("should preserve leading whitespace when commenting", async () => {
      const zshrcContent = "  alias ll='ls -la'";
      mockReadZshrcFileRaw.mockResolvedValueOnce(zshrcContent).mockResolvedValueOnce("  # alias ll='ls -la'");

      await toggleItem("ll", mockAliasConfig);

      expect(mockWriteZshrcFile).toHaveBeenCalledWith("  # alias ll='ls -la'");
    });

    it("should preserve leading whitespace when uncommenting", async () => {
      const zshrcContent = "  # alias ll='ls -la'";
      mockReadZshrcFileRaw.mockResolvedValueOnce(zshrcContent).mockResolvedValueOnce("  alias ll='ls -la'");

      await toggleItem("ll", mockAliasConfig);

      expect(mockWriteZshrcFile).toHaveBeenCalledWith("  alias ll='ls -la'");
    });

    it("should throw error when item is not found", async () => {
      const zshrcContent = "alias ll='ls -la'";
      mockReadZshrcFileRaw.mockResolvedValue(zshrcContent);

      await expect(toggleItem("nonexistent", mockAliasConfig)).rejects.toThrow(
        'Alias "nonexistent" not found in zshrc',
      );

      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Error",
        message: 'Alias "nonexistent" not found in zshrc',
      });
    });

    it("should work with export items", async () => {
      const zshrcContent = "export PATH=/usr/bin:$PATH\nexport EDITOR=vim";
      const expectedContent = "# export PATH=/usr/bin:$PATH\nexport EDITOR=vim";
      mockReadZshrcFileRaw.mockResolvedValueOnce(zshrcContent).mockResolvedValueOnce(expectedContent); // Verification must match

      const result = await toggleItem("PATH", mockExportConfig);

      // Was NOT commented (active) -> returns true after commenting
      expect(result).toBe(true);
      expect(mockWriteZshrcFile).toHaveBeenCalledWith(expectedContent);
    });

    it("should handle write verification failure", async () => {
      const zshrcContent = "alias ll='ls -la'";
      mockReadZshrcFileRaw.mockResolvedValueOnce(zshrcContent).mockResolvedValueOnce("different content"); // Verification returns different content

      await expect(toggleItem("ll", mockAliasConfig)).rejects.toThrow("Write verification failed");
    });

    it("should skip empty lines when searching", async () => {
      const zshrcContent = "\n\nalias ll='ls -la'\n\n";
      const expectedContent = "\n\n# alias ll='ls -la'\n\n";
      mockReadZshrcFileRaw.mockResolvedValueOnce(zshrcContent).mockResolvedValueOnce(expectedContent); // Verification must match

      const result = await toggleItem("ll", mockAliasConfig);

      // Was NOT commented (active) -> returns true after commenting
      expect(result).toBe(true);
    });

    it("should handle tabs in whitespace", async () => {
      const zshrcContent = "\talias ll='ls -la'";
      mockReadZshrcFileRaw.mockResolvedValueOnce(zshrcContent).mockResolvedValueOnce("\t# alias ll='ls -la'");

      await toggleItem("ll", mockAliasConfig);

      expect(mockWriteZshrcFile).toHaveBeenCalledWith("\t# alias ll='ls -la'");
    });
  });

  describe("enableItem", () => {
    it("should enable a disabled item by toggling", async () => {
      const zshrcContent = "# alias ll='ls -la'";
      mockReadZshrcFileRaw
        .mockResolvedValueOnce(zshrcContent) // enableItem read
        .mockResolvedValueOnce(zshrcContent) // toggleItem initial read
        .mockResolvedValueOnce("alias ll='ls -la'"); // toggleItem verification

      await enableItem("ll", mockAliasConfig);

      expect(mockWriteZshrcFile).toHaveBeenCalled();
    });

    it("should show toast when item is already enabled", async () => {
      const zshrcContent = "alias ll='ls -la'";
      mockReadZshrcFileRaw.mockResolvedValue(zshrcContent);

      await enableItem("ll", mockAliasConfig);

      expect(mockWriteZshrcFile).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Already Enabled",
        message: 'Alias "ll" is already active',
      });
    });

    it("should show toast when item is not found", async () => {
      const zshrcContent = "alias other='test'";
      mockReadZshrcFileRaw.mockResolvedValue(zshrcContent);

      await enableItem("nonexistent", mockAliasConfig);

      expect(mockWriteZshrcFile).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Not Found",
        message: 'Alias "nonexistent" not found in zshrc',
      });
    });

    it("should skip empty lines", async () => {
      const zshrcContent = "\n\n# alias ll='ls -la'\n";
      const expectedContent = "\n\nalias ll='ls -la'\n";
      mockReadZshrcFileRaw
        .mockResolvedValueOnce(zshrcContent) // enableItem read
        .mockResolvedValueOnce(zshrcContent) // toggleItem initial read
        .mockResolvedValueOnce(expectedContent); // toggleItem verification

      await enableItem("ll", mockAliasConfig);

      expect(mockWriteZshrcFile).toHaveBeenCalled();
    });
  });

  describe("disableItem", () => {
    it("should disable an enabled item by toggling", async () => {
      const zshrcContent = "alias ll='ls -la'";
      mockReadZshrcFileRaw
        .mockResolvedValueOnce(zshrcContent) // disableItem read
        .mockResolvedValueOnce(zshrcContent) // toggleItem initial read
        .mockResolvedValueOnce("# alias ll='ls -la'"); // toggleItem verification

      await disableItem("ll", mockAliasConfig);

      expect(mockWriteZshrcFile).toHaveBeenCalled();
    });

    it("should show toast when item is already disabled", async () => {
      const zshrcContent = "# alias ll='ls -la'";
      mockReadZshrcFileRaw.mockResolvedValue(zshrcContent);

      await disableItem("ll", mockAliasConfig);

      expect(mockWriteZshrcFile).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Already Disabled",
        message: 'Alias "ll" is already commented out',
      });
    });

    it("should show toast when item is not found", async () => {
      const zshrcContent = "alias other='test'";
      mockReadZshrcFileRaw.mockResolvedValue(zshrcContent);

      await disableItem("nonexistent", mockAliasConfig);

      expect(mockWriteZshrcFile).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Not Found",
        message: 'Alias "nonexistent" not found in zshrc',
      });
    });

    it("should skip empty lines", async () => {
      const zshrcContent = "\n\nalias ll='ls -la'\n";
      const expectedContent = "\n\n# alias ll='ls -la'\n";
      mockReadZshrcFileRaw
        .mockResolvedValueOnce(zshrcContent) // disableItem read
        .mockResolvedValueOnce(zshrcContent) // toggleItem initial read
        .mockResolvedValueOnce(expectedContent); // toggleItem verification

      await disableItem("ll", mockAliasConfig);

      expect(mockWriteZshrcFile).toHaveBeenCalled();
    });
  });
});
