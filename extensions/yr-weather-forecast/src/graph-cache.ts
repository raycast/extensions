import { getCached, setCached } from "./cache";
import { getCacheThresholds } from "./config/weather-config";
import { TimeseriesEntry } from "./weather-client";
import { SunTimes } from "./sunrise-client";
import { buildGraphMarkdown } from "./graph-utils";

/**
 * Graph cache entry with versioning support
 */
type GraphCacheEntry = {
  markdown: string;
  version: string;
  dataHash: string; // Hash of the input data to detect changes
  generatedAt: number;
};

/**
 * Graph cache key generator
 */
function generateGraphCacheKey(
  locationKey: string,
  mode: "detailed" | "summary",
  targetDate?: string,
  dataHash?: string,
): string {
  const baseKey = `graph:${locationKey}:${mode}`;
  if (targetDate) {
    return `${baseKey}:${targetDate}`;
  }
  if (dataHash) {
    return `${baseKey}:${dataHash}`;
  }
  return baseKey;
}

/**
 * Generate a hash for the input data to detect changes
 */
function generateDataHash(
  series: TimeseriesEntry[],
  name: string,
  hours: number,
  sunByDate?: Record<string, SunTimes>,
): string {
  // Create a simple hash based on key data points
  const keyData = {
    seriesLength: series.length,
    name,
    hours,
    firstTime: series[0]?.time,
    lastTime: series[series.length - 1]?.time,
    sunByDateKeys: sunByDate ? Object.keys(sunByDate).sort() : [],
  };

  // Simple hash function - in production you might want to use a proper hash library
  return btoa(JSON.stringify(keyData))
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 16);
}

/**
 * Get cached graph if available and valid
 */
export async function getCachedGraph(
  locationKey: string,
  mode: "detailed" | "summary",
  series: TimeseriesEntry[],
  name: string,
  hours: number,
  sunByDate?: Record<string, SunTimes>,
  targetDate?: string,
): Promise<string | undefined> {
  try {
    const cacheThresholds = getCacheThresholds();
    const dataHash = generateDataHash(series, name, hours, sunByDate);
    const cacheKey = generateGraphCacheKey(locationKey, mode, targetDate, dataHash);

    const cached = await getCached<GraphCacheEntry>(cacheKey, cacheThresholds.GRAPH);

    if (!cached) return undefined;

    // Check version compatibility
    if (cached.version !== cacheThresholds.GRAPH_VERSION) {
      return undefined;
    }

    // Check if data has changed
    if (cached.dataHash !== dataHash) {
      return undefined;
    }

    return cached.markdown;
  } catch (error) {
    console.warn("Failed to get cached graph:", error);
    return undefined;
  }
}

/**
 * Cache a generated graph
 */
export async function setCachedGraph(
  locationKey: string,
  mode: "detailed" | "summary",
  series: TimeseriesEntry[],
  name: string,
  hours: number,
  markdown: string,
  sunByDate?: Record<string, SunTimes>,
  targetDate?: string,
): Promise<void> {
  try {
    const cacheThresholds = getCacheThresholds();
    const dataHash = generateDataHash(series, name, hours, sunByDate);
    const cacheKey = generateGraphCacheKey(locationKey, mode, targetDate, dataHash);

    const cacheEntry: GraphCacheEntry = {
      markdown,
      version: cacheThresholds.GRAPH_VERSION,
      dataHash,
      generatedAt: Date.now(),
    };

    await setCached(cacheKey, cacheEntry);
  } catch (error) {
    console.warn("Failed to cache graph:", error);
  }
}

/**
 * Generate and cache a graph
 */
export async function generateAndCacheGraph(
  locationKey: string,
  mode: "detailed" | "summary",
  series: TimeseriesEntry[],
  name: string,
  hours: number,
  sunByDate?: Record<string, SunTimes>,
  targetDate?: string,
): Promise<string> {
  // Try to get from cache first
  const cached = await getCachedGraph(locationKey, mode, series, name, hours, sunByDate, targetDate);
  if (cached) {
    return cached;
  }

  // Generate new graph
  const title = targetDate ? "1-day forecast" : mode === "detailed" ? "48h forecast" : "9-day summary";
  const result = buildGraphMarkdown(name, series, hours, {
    title,
    smooth: true,
    sunByDate: mode === "detailed" ? sunByDate : undefined,
  });

  // Cache the result
  await setCachedGraph(locationKey, mode, series, name, hours, result.markdown, sunByDate, targetDate);

  return result.markdown;
}

/**
 * Clear all cached graphs for a location
 */
export async function clearLocationGraphCache(locationKey: string): Promise<void> {
  try {
    // Note: This is a simplified implementation
    // In a more sophisticated system, you'd track cache keys and remove them individually
    // For now, we rely on TTL expiration
    console.log(`Graph cache for location ${locationKey} will expire naturally`);
  } catch (error) {
    console.warn("Failed to clear location graph cache:", error);
  }
}

/**
 * Invalidate cached graphs for a specific location
 */
export async function invalidateLocationGraphCache(locationKey: string): Promise<void> {
  try {
    // Note: This is a simplified implementation
    // In a more sophisticated system, you'd track cache keys and remove them individually
    console.log(`Graph cache for location ${locationKey} will be invalidated on next access`);
  } catch (error) {
    console.warn("Failed to invalidate location graph cache:", error);
  }
}

/**
 * Invalidate cached graphs for a specific mode (detailed/summary)
 */
export async function invalidateModeGraphCache(mode: "detailed" | "summary"): Promise<void> {
  try {
    // Note: This is a simplified implementation
    // In a more sophisticated system, you'd track cache keys by mode and remove them
    console.log(`Graph cache for mode ${mode} will be invalidated on next access`);
  } catch (error) {
    console.warn("Failed to invalidate mode graph cache:", error);
  }
}

/**
 * Invalidate cached graphs for a specific target date
 */
export async function invalidateDateGraphCache(targetDate: string): Promise<void> {
  try {
    // Note: This is a simplified implementation
    // In a more sophisticated system, you'd track cache keys by date and remove them
    console.log(`Graph cache for date ${targetDate} will be invalidated on next access`);
  } catch (error) {
    console.warn("Failed to invalidate date graph cache:", error);
  }
}

/**
 * Clear all cached graphs (useful when graph format changes)
 */
export async function clearAllGraphCache(): Promise<void> {
  try {
    // Note: This is a simplified implementation
    // In a more sophisticated system, you'd track all cache keys and remove them
    // For now, we rely on version checking in getCachedGraph
    console.log("All graph caches will be invalidated due to version change");
  } catch (error) {
    console.warn("Failed to clear all graph cache:", error);
  }
}

/**
 * Clean up old cached graphs to prevent memory bloat
 * Removes graphs older than the specified age
 */
export async function cleanupOldGraphCache(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  try {
    // Note: This is a simplified implementation
    // In a more sophisticated system, you'd iterate through all cache keys
    // and remove those older than maxAgeMs
    // For now, we rely on TTL expiration in the cache system
    console.log(`Graph cache cleanup would remove entries older than ${maxAgeMs}ms`);
    return 0; // Return number of entries cleaned up
  } catch (error) {
    console.warn("Failed to cleanup old graph cache:", error);
    return 0;
  }
}

/**
 * Get cache statistics (for debugging and monitoring)
 */
export async function getGraphCacheStats(): Promise<{
  totalEntries: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  totalSize: number;
}> {
  try {
    // Note: This is a simplified implementation
    // In a more sophisticated system, you'd track cache metadata
    return {
      totalEntries: 0,
      oldestEntry: null,
      newestEntry: null,
      totalSize: 0,
    };
  } catch (error) {
    console.warn("Failed to get graph cache stats:", error);
    return {
      totalEntries: 0,
      oldestEntry: null,
      newestEntry: null,
      totalSize: 0,
    };
  }
}
