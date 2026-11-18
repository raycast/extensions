/**
 * Tests for history.ts - History and undo functionality
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { LocalStorage, showToast, Toast } from "@raycast/api";

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
vi.mock("../utils/logger", () => ({
  log: {
    history: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  },
}));

import {
  saveToHistory,
  getHistory,
  undoLastChange,
  clearHistory,
  getUndoCount,
  formatHistoryEntry,
} from "../lib/history";
import { readZshrcFileRaw, writeZshrcFile, getZshrcPath } from "../lib/zsh";
import { clearCache } from "../lib/cache";

const mockLocalStorage = vi.mocked(LocalStorage);
const mockShowToast = vi.mocked(showToast);
const mockReadZshrcFileRaw = vi.mocked(readZshrcFileRaw);
const mockWriteZshrcFile = vi.mocked(writeZshrcFile);
const mockGetZshrcPath = vi.mocked(getZshrcPath);
const mockClearCache = vi.mocked(clearCache);

describe("history.ts", () => {
  const HISTORY_KEY = "zshrc-manager-history";
  const TEST_PATH = "/Users/test/.zshrc";
  const TEST_CONTENT = "alias ll='ls -la'\nexport PATH=/usr/bin:$PATH";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetZshrcPath.mockReturnValue(TEST_PATH);
    mockReadZshrcFileRaw.mockResolvedValue(TEST_CONTENT);
    mockWriteZshrcFile.mockResolvedValue(undefined);
    mockLocalStorage.getItem.mockResolvedValue(undefined);
    mockLocalStorage.setItem.mockResolvedValue(undefined);
    mockLocalStorage.removeItem.mockResolvedValue(undefined);
    mockShowToast.mockResolvedValue({} as unknown as Toast);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("saveToHistory", () => {
    it("should save a new history entry", async () => {
      await saveToHistory("Add new alias");

      expect(mockReadZshrcFileRaw).toHaveBeenCalled();
      expect(mockGetZshrcPath).toHaveBeenCalled();
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(HISTORY_KEY, expect.stringContaining("Add new alias"));
    });

    it("should prepend new entries to existing history", async () => {
      const existingHistory = JSON.stringify([
        {
          timestamp: Date.now() - 1000,
          description: "Old entry",
          previousContent: "old content",
          filePath: TEST_PATH,
        },
      ]);
      mockLocalStorage.getItem.mockResolvedValue(existingHistory);

      await saveToHistory("New entry");

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(HISTORY_KEY, expect.any(String));

      // Verify the new entry is first
      const calls = (mockLocalStorage.setItem as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0]).toBeDefined();
      const savedData = JSON.parse(calls[0]![1]);
      expect(savedData).toHaveLength(2);
      expect(savedData[0].description).toBe("New entry");
      expect(savedData[1].description).toBe("Old entry");
    });

    it("should limit history to 10 entries", async () => {
      const existingHistory = JSON.stringify(
        Array.from({ length: 10 }, (_, i) => ({
          timestamp: Date.now() - i * 1000,
          description: `Entry ${i}`,
          previousContent: `content ${i}`,
          filePath: TEST_PATH,
        })),
      );
      mockLocalStorage.getItem.mockResolvedValue(existingHistory);

      await saveToHistory("New entry that should push out oldest");

      const calls = (mockLocalStorage.setItem as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0]).toBeDefined();
      const savedData = JSON.parse(calls[0]![1]);
      expect(savedData).toHaveLength(10);
      expect(savedData[0].description).toBe("New entry that should push out oldest");
    });

    it("should handle errors gracefully", async () => {
      mockReadZshrcFileRaw.mockRejectedValue(new Error("Read error"));

      // Should not throw and return false to indicate failure
      const result = await saveToHistory("Test");
      expect(result).toBe(false);
    });

    it("should store the current file content as previousContent", async () => {
      const expectedContent = "# Test content\nalias test='echo test'";
      mockReadZshrcFileRaw.mockResolvedValue(expectedContent);

      await saveToHistory("Test description");

      const calls = (mockLocalStorage.setItem as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0]).toBeDefined();
      const savedData = JSON.parse(calls[0]![1]);
      expect(savedData[0].previousContent).toBe(expectedContent);
    });

    it("should store the current file path", async () => {
      const customPath = "/custom/path/.zshrc";
      mockGetZshrcPath.mockReturnValue(customPath);

      await saveToHistory("Test description");

      const calls = (mockLocalStorage.setItem as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0]).toBeDefined();
      const savedData = JSON.parse(calls[0]![1]);
      expect(savedData[0].filePath).toBe(customPath);
    });
  });

  describe("getHistory", () => {
    it("should return empty array when no history exists", async () => {
      mockLocalStorage.getItem.mockResolvedValue(undefined);

      const history = await getHistory();

      expect(history).toEqual([]);
    });

    it("should return parsed history from LocalStorage", async () => {
      const historyData = [
        {
          timestamp: 1000,
          description: "Test entry",
          previousContent: "content",
          filePath: TEST_PATH,
        },
      ];
      mockLocalStorage.getItem.mockResolvedValue(JSON.stringify(historyData));

      const history = await getHistory();

      expect(history).toEqual(historyData);
    });

    it("should return empty array on parse error", async () => {
      mockLocalStorage.getItem.mockResolvedValue("invalid json");

      const history = await getHistory();

      expect(history).toEqual([]);
    });

    it("should return empty array when LocalStorage throws", async () => {
      mockLocalStorage.getItem.mockRejectedValue(new Error("Storage error"));

      const history = await getHistory();

      expect(history).toEqual([]);
    });
  });

  describe("undoLastChange", () => {
    it("should return false and show toast when history is empty", async () => {
      mockLocalStorage.getItem.mockResolvedValue(undefined);

      const result = await undoLastChange();

      expect(result).toBe(false);
      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Nothing to Undo",
        message: "No changes in history",
      });
    });

    it("should restore previous content and return true on success", async () => {
      const historyData = [
        {
          timestamp: Date.now(),
          description: "Added alias",
          previousContent: "original content",
          filePath: TEST_PATH,
        },
      ];
      mockLocalStorage.getItem.mockResolvedValue(JSON.stringify(historyData));

      const result = await undoLastChange();

      expect(result).toBe(true);
      expect(mockWriteZshrcFile).toHaveBeenCalledWith("original content");
      expect(mockClearCache).toHaveBeenCalledWith(TEST_PATH);
      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Undo Successful",
        message: "Reverted: Added alias",
      });
    });

    it("should remove the undone entry from history", async () => {
      const historyData = [
        {
          timestamp: Date.now(),
          description: "Entry 1",
          previousContent: "content 1",
          filePath: TEST_PATH,
        },
        {
          timestamp: Date.now() - 1000,
          description: "Entry 2",
          previousContent: "content 2",
          filePath: TEST_PATH,
        },
      ];
      mockLocalStorage.getItem.mockResolvedValue(JSON.stringify(historyData));

      await undoLastChange();

      const calls = (mockLocalStorage.setItem as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0]).toBeDefined();
      const savedData = JSON.parse(calls[0]![1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].description).toBe("Entry 2");
    });

    it("should fail when history entry is for different file", async () => {
      const historyData = [
        {
          timestamp: Date.now(),
          description: "Added alias",
          previousContent: "content",
          filePath: "/different/path/.zshrc",
        },
      ];
      mockLocalStorage.getItem.mockResolvedValue(JSON.stringify(historyData));

      const result = await undoLastChange();

      expect(result).toBe(false);
      expect(mockWriteZshrcFile).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Cannot Undo",
        message: "Last change was for a different config file",
      });
    });

    it("should handle write errors", async () => {
      const historyData = [
        {
          timestamp: Date.now(),
          description: "Added alias",
          previousContent: "content",
          filePath: TEST_PATH,
        },
      ];
      mockLocalStorage.getItem.mockResolvedValue(JSON.stringify(historyData));
      mockWriteZshrcFile.mockRejectedValue(new Error("Write failed"));

      const result = await undoLastChange();

      expect(result).toBe(false);
      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Undo Failed",
        message: "Write failed",
      });
    });

    it("should handle non-Error exceptions", async () => {
      const historyData = [
        {
          timestamp: Date.now(),
          description: "Added alias",
          previousContent: "content",
          filePath: TEST_PATH,
        },
      ];
      mockLocalStorage.getItem.mockResolvedValue(JSON.stringify(historyData));
      mockWriteZshrcFile.mockRejectedValue("Unknown error string");

      const result = await undoLastChange();

      expect(result).toBe(false);
      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Undo Failed",
        message: "Unknown error",
      });
    });
  });

  describe("clearHistory", () => {
    it("should remove history from LocalStorage", async () => {
      await clearHistory();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(HISTORY_KEY);
    });
  });

  describe("getUndoCount", () => {
    it("should return 0 when history is empty", async () => {
      mockLocalStorage.getItem.mockResolvedValue(undefined);

      const count = await getUndoCount();

      expect(count).toBe(0);
    });

    it("should return the number of history entries", async () => {
      const historyData = [
        { timestamp: 1, description: "1", previousContent: "c1", filePath: TEST_PATH },
        { timestamp: 2, description: "2", previousContent: "c2", filePath: TEST_PATH },
        { timestamp: 3, description: "3", previousContent: "c3", filePath: TEST_PATH },
      ];
      mockLocalStorage.getItem.mockResolvedValue(JSON.stringify(historyData));

      const count = await getUndoCount();

      expect(count).toBe(3);
    });
  });

  describe("formatHistoryEntry", () => {
    it("should format entry with time and description", () => {
      // Use a fixed timestamp for predictable testing
      const timestamp = new Date("2024-01-15T10:30:00").getTime();
      const entry = {
        timestamp,
        description: "Added new alias",
        previousContent: "content",
        filePath: TEST_PATH,
      };

      const formatted = formatHistoryEntry(entry);

      // Should contain time in HH:MM format and the description
      expect(formatted).toContain("Added new alias");
      expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Time format
      expect(formatted).toContain(" - ");
    });

    it("should handle different timestamps correctly", () => {
      const entry1 = {
        timestamp: new Date("2024-01-15T09:05:00").getTime(),
        description: "Morning change",
        previousContent: "content",
        filePath: TEST_PATH,
      };
      const entry2 = {
        timestamp: new Date("2024-01-15T14:45:00").getTime(),
        description: "Afternoon change",
        previousContent: "content",
        filePath: TEST_PATH,
      };

      const formatted1 = formatHistoryEntry(entry1);
      const formatted2 = formatHistoryEntry(entry2);

      expect(formatted1).toContain("Morning change");
      expect(formatted2).toContain("Afternoon change");
    });
  });
});
