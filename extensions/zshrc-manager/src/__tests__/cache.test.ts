/* eslint-disable @typescript-eslint/no-explicit-any */

import { stat } from "fs/promises";
import { getCachedSections, setCachedSections, clearCache, getCacheStats } from "../lib/cache";
import { LogicalSection } from "../lib/parse-zshrc";
import { vi } from "vitest";

// Mock fs/promises
vi.mock("fs/promises");
const mockStat = vi.mocked(stat);

describe("cache.ts", () => {
  const mockFilePath = "/test/.zshrc";
  const mockSections: LogicalSection[] = [
    {
      label: "Test Section",
      startLine: 1,
      endLine: 10,
      content: "export TEST=value",
      aliasCount: 0,
      exportCount: 1,
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
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    clearCache(); // Clear cache before each test
  });

  describe("getCachedSections", () => {
    it("should return null for non-existent cache entry", async () => {
      const result = await getCachedSections(mockFilePath);
      expect(result).toBeNull();
    });

    it("should return cached data when valid", async () => {
      const mockStats = {
        size: 100,
        mtime: new Date(1000),
      };

      mockStat.mockResolvedValue(mockStats as any);

      // Set cache
      await setCachedSections(mockFilePath, mockSections);

      // Get from cache
      const result = await getCachedSections(mockFilePath);

      expect(result).toEqual(mockSections);
      expect(mockStat).toHaveBeenCalledWith(mockFilePath);
    });

    it("should return null when TTL is expired", async () => {
      const mockStats = {
        size: 100,
        mtime: new Date(1000),
      };

      mockStat.mockResolvedValue(mockStats as any);

      // Set cache
      await setCachedSections(mockFilePath, mockSections);

      // Mock Date.now to simulate expired TTL
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 1000000); // Far in the future

      const result = await getCachedSections(mockFilePath);

      expect(result).toBeNull();

      // Restore Date.now
      Date.now = originalNow;
    });

    it("should return null when file size changes", async () => {
      const mockStats1 = {
        size: 100,
        mtime: new Date(1000),
      };
      const mockStats2 = {
        size: 200, // Different size
        mtime: new Date(1000),
      };

      mockStat
        .mockResolvedValueOnce(mockStats1 as any) // For set
        .mockResolvedValueOnce(mockStats2 as any); // For get

      // Set cache
      await setCachedSections(mockFilePath, mockSections);

      // Get from cache
      const result = await getCachedSections(mockFilePath);

      expect(result).toBeNull();
    });

    it("should return null when file mtime changes", async () => {
      const mockStats1 = {
        size: 100,
        mtime: new Date(1000),
      };
      const mockStats2 = {
        size: 100,
        mtime: new Date(2000), // Different mtime
      };

      mockStat
        .mockResolvedValueOnce(mockStats1 as any) // For set
        .mockResolvedValueOnce(mockStats2 as any); // For get

      // Set cache
      await setCachedSections(mockFilePath, mockSections);

      // Get from cache
      const result = await getCachedSections(mockFilePath);

      expect(result).toBeNull();
    });

    it("should return null when file no longer exists", async () => {
      const mockStats = {
        size: 100,
        mtime: new Date(1000),
      };

      mockStat
        .mockResolvedValueOnce(mockStats as any) // For set
        .mockRejectedValueOnce(new Error("ENOENT")); // For get

      // Set cache
      await setCachedSections(mockFilePath, mockSections);

      // Get from cache
      const result = await getCachedSections(mockFilePath);

      expect(result).toBeNull();
    });
  });

  describe("setCachedSections", () => {
    it("should cache sections successfully", async () => {
      const mockStats = {
        size: 100,
        mtime: new Date(1000),
      };

      mockStat.mockResolvedValue(mockStats as any);

      await setCachedSections(mockFilePath, mockSections);

      expect(mockStat).toHaveBeenCalledWith(mockFilePath);
    });

    it("should handle file stat errors gracefully", async () => {
      mockStat.mockRejectedValue(new Error("Permission denied"));

      // Should not throw
      await expect(setCachedSections(mockFilePath, mockSections)).resolves.toBeUndefined();
    });
  });

  describe("clearCache", () => {
    it("should clear specific file from cache", async () => {
      const mockStats = {
        size: 100,
        mtime: new Date(1000),
      };

      mockStat.mockResolvedValue(mockStats as any);

      // Set cache
      await setCachedSections(mockFilePath, mockSections);

      // Verify cache has data
      let result = await getCachedSections(mockFilePath);
      expect(result).toEqual(mockSections);

      // Clear specific file
      clearCache(mockFilePath);

      // Verify cache is cleared
      result = await getCachedSections(mockFilePath);
      expect(result).toBeNull();
    });

    it("should clear all cache when no file path provided", async () => {
      const mockStats = {
        size: 100,
        mtime: new Date(1000),
      };

      mockStat.mockResolvedValue(mockStats as any);

      // Set cache for multiple files
      await setCachedSections(mockFilePath, mockSections);
      await setCachedSections("/another/file", mockSections);

      // Clear all cache
      clearCache();

      // Verify all cache is cleared
      const result1 = await getCachedSections(mockFilePath);
      const result2 = await getCachedSections("/another/file");
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe("getCacheStats", () => {
    it("should return empty stats for empty cache", () => {
      const stats = getCacheStats();
      expect(stats).toEqual({
        size: 0,
        entries: [],
      });
    });

    it("should return correct stats for populated cache", async () => {
      const mockStats = {
        size: 100,
        mtime: new Date(1000),
      };

      mockStat.mockResolvedValue(mockStats as any);

      // Set cache
      await setCachedSections(mockFilePath, mockSections);

      const stats = getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries).toContain(mockFilePath);
    });
  });
});
