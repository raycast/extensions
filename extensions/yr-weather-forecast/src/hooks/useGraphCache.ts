import { useCallback } from "react";
import {
  clearAllGraphCache,
  cleanupOldGraphCache,
  invalidateLocationGraphCache,
  invalidateModeGraphCache,
  invalidateDateGraphCache,
  getGraphCacheStats,
} from "../graph-cache";

/**
 * Hook for managing graph cache operations
 */
export function useGraphCache() {
  /**
   * Clear all cached graphs
   */
  const clearAllCache = useCallback(async () => {
    try {
      await clearAllGraphCache();
      console.log("All graph caches cleared");
    } catch (error) {
      console.error("Failed to clear all graph caches:", error);
    }
  }, []);

  /**
   * Clean up old cached graphs
   */
  const cleanupCache = useCallback(async (maxAgeMs?: number) => {
    try {
      const cleanedCount = await cleanupOldGraphCache(maxAgeMs);
      console.log(`Cleaned up ${cleanedCount} old graph cache entries`);
      return cleanedCount;
    } catch (error) {
      console.error("Failed to cleanup graph caches:", error);
      return 0;
    }
  }, []);

  /**
   * Invalidate cache for a specific location
   */
  const invalidateLocation = useCallback(async (locationKey: string) => {
    try {
      await invalidateLocationGraphCache(locationKey);
      console.log(`Invalidated graph cache for location: ${locationKey}`);
    } catch (error) {
      console.error("Failed to invalidate location graph cache:", error);
    }
  }, []);

  /**
   * Invalidate cache for a specific mode
   */
  const invalidateMode = useCallback(async (mode: "detailed" | "summary") => {
    try {
      await invalidateModeGraphCache(mode);
      console.log(`Invalidated graph cache for mode: ${mode}`);
    } catch (error) {
      console.error("Failed to invalidate mode graph cache:", error);
    }
  }, []);

  /**
   * Invalidate cache for a specific date
   */
  const invalidateDate = useCallback(async (targetDate: string) => {
    try {
      await invalidateDateGraphCache(targetDate);
      console.log(`Invalidated graph cache for date: ${targetDate}`);
    } catch (error) {
      console.error("Failed to invalidate date graph cache:", error);
    }
  }, []);

  /**
   * Get cache statistics
   */
  const getStats = useCallback(async () => {
    try {
      const stats = await getGraphCacheStats();
      console.log("Graph cache stats:", stats);
      return stats;
    } catch (error) {
      console.error("Failed to get graph cache stats:", error);
      return {
        totalEntries: 0,
        oldestEntry: null,
        newestEntry: null,
        totalSize: 0,
      };
    }
  }, []);

  return {
    clearAllCache,
    cleanupCache,
    invalidateLocation,
    invalidateMode,
    invalidateDate,
    getStats,
  };
}
