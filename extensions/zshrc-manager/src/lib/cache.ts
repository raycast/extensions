/**
 * Caching layer for parsed zshrc content
 *
 * Provides TTL-based caching with file change detection
 * to optimize performance while ensuring data freshness.
 */

import { stat } from "fs/promises";
import { CACHE_CONSTANTS } from "../constants";
import { LogicalSection } from "./parse-zshrc";

/**
 * Cache entry containing parsed data and metadata
 */
interface CacheEntry {
  readonly data: LogicalSection[];
  readonly timestamp: number;
  readonly fileSize: number;
  readonly fileMtime: number;
}

/**
 * In-memory cache for zshrc content
 */
class ZshrcCache {
  private cache = new Map<string, CacheEntry>();
  private readonly ttl: number;

  constructor(ttl: number = CACHE_CONSTANTS.DEFAULT_TTL) {
    this.ttl = ttl;
  }

  /**
   * Get cached data if valid
   */
  async get(filePath: string): Promise<LogicalSection[] | null> {
    const entry = this.cache.get(filePath);
    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(filePath);
      return null;
    }

    try {
      // Check if file has changed
      const stats = await stat(filePath);
      if (stats.size !== entry.fileSize || stats.mtime.getTime() !== entry.fileMtime) {
        this.cache.delete(filePath);
        return null;
      }
    } catch {
      // File no longer exists or can't be accessed
      this.cache.delete(filePath);
      return null;
    }

    return entry.data;
  }

  /**
   * Store data in cache
   */
  async set(filePath: string, data: LogicalSection[]): Promise<void> {
    try {
      const stats = await stat(filePath);
      this.cache.set(filePath, {
        data,
        timestamp: Date.now(),
        fileSize: stats.size,
        fileMtime: stats.mtime.getTime(),
      });
    } catch {
      // Don't cache if we can't get file stats
    }
  }

  /**
   * Clear cache for specific file or all files
   */
  clear(filePath?: string): void {
    if (filePath) {
      this.cache.delete(filePath);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Global cache instance
const cache = new ZshrcCache();

/**
 * Get cached zshrc sections or null if not cached/expired
 */
export async function getCachedSections(filePath: string): Promise<LogicalSection[] | null> {
  return cache.get(filePath);
}

/**
 * Cache zshrc sections
 */
export async function setCachedSections(filePath: string, sections: LogicalSection[]): Promise<void> {
  await cache.set(filePath, sections);
}

/**
 * Clear cache for specific file or all files
 */
export function clearCache(filePath?: string): void {
  cache.clear(filePath);
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return cache.getStats();
}
