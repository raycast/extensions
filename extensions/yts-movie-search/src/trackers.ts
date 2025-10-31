import { LocalStorage } from "@raycast/api";
import fetch from "node-fetch";
import { CONFIG, FALLBACK_TRACKERS } from "./constants";

interface TrackerCache {
  trackers: string[];
  lastUpdated: number;
}

// Module-level state: current trackers in use
// Initialized with fallback, updated by refresh
let currentTrackers: string[] = [...FALLBACK_TRACKERS];

/**
 * Fetches the latest tracker list from the configured source URL
 * @returns Promise resolving to array of tracker URLs
 */
async function fetchTrackersFromSource(): Promise<string[]> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), CONFIG.trackers.fetchTimeoutMs);

  try {
    const response = await fetch(CONFIG.trackers.sourceUrl, {
      signal: timeoutController.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch trackers: ${response.statusText}`);
    }

    const text = await response.text();

    // Parse line-by-line, filter empty lines and trim whitespace
    const trackers = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.startsWith("udp://"));

    return trackers;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Tracker fetch timed out");
    }
    throw error;
  }
}

/**
 * Retrieves tracker cache from LocalStorage
 * @returns Promise resolving to TrackerCache or null if not found
 */
async function getTrackerCache(): Promise<TrackerCache | null> {
  try {
    const cacheJson = await LocalStorage.getItem<string>(CONFIG.trackers.storageKey);
    if (!cacheJson) {
      return null;
    }
    return JSON.parse(cacheJson) as TrackerCache;
  } catch (error) {
    console.error("Failed to read tracker cache:", error);
    return null;
  }
}

/**
 * Saves tracker list to LocalStorage cache
 * @param trackers Array of tracker URLs to cache
 */
async function saveTrackerCache(trackers: string[]): Promise<void> {
  try {
    const cache: TrackerCache = {
      trackers,
      lastUpdated: Date.now(),
    };
    await LocalStorage.setItem(CONFIG.trackers.storageKey, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to save tracker cache:", error);
  }
}

/**
 * Checks if the tracker cache is stale (older than configured duration)
 * @param cache The tracker cache to check
 * @returns True if cache is stale or invalid
 */
function isCacheStale(cache: TrackerCache | null): boolean {
  if (!cache || !cache.lastUpdated || !Array.isArray(cache.trackers) || cache.trackers.length === 0) {
    return true;
  }

  const age = Date.now() - cache.lastUpdated;
  return age > CONFIG.trackers.cacheDurationMs;
}

/**
 * Gets the current tracker list (synchronous)
 * Returns the module-level tracker state
 * @returns Array of tracker URLs
 */
export function getCurrentTrackers(): string[] {
  return currentTrackers;
}

/**
 * Initializes the tracker state from cache
 * Called once on extension startup
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeTrackers(): Promise<void> {
  try {
    const cache = await getTrackerCache();

    // Load cached trackers if valid and not stale
    if (cache && !isCacheStale(cache)) {
      currentTrackers = cache.trackers;
      console.log(`Loaded ${currentTrackers.length} trackers from cache`);
    } else {
      console.log(`Using ${currentTrackers.length} fallback trackers (cache stale or missing)`);
    }
  } catch (error) {
    console.error("Failed to initialize trackers:", error);
    // Keep using fallback trackers
  }
}

/**
 * Refreshes the tracker list if the cache is stale
 * Runs in the background without blocking
 * Falls back to cached/hardcoded trackers on failure
 * Updates module-level state on success
 */
export async function refreshTrackersIfNeeded(): Promise<void> {
  try {
    const cache = await getTrackerCache();

    // Skip if cache is fresh
    if (cache && !isCacheStale(cache)) {
      return;
    }

    // Fetch fresh tracker list
    const trackers = await fetchTrackersFromSource();

    // Validate we got a reasonable number of trackers
    if (trackers.length < 5) {
      console.warn(`Fetched tracker list too short (${trackers.length} trackers), skipping update`);
      return;
    }

    // Save to cache and update module state
    await saveTrackerCache(trackers);
    currentTrackers = trackers;
    console.log(`Successfully updated tracker cache with ${trackers.length} trackers`);
  } catch (error) {
    // Silently fail - we'll use cached or fallback trackers
    console.error("Failed to refresh tracker list:", error);
  }
}

/**
 * Forces an immediate refresh of the tracker list
 * Useful for manual updates or debugging
 * Updates module-level state on success
 * @returns Promise resolving to the new tracker list
 */
export async function forceRefreshTrackers(): Promise<string[]> {
  try {
    const trackers = await fetchTrackersFromSource();
    await saveTrackerCache(trackers);
    currentTrackers = trackers;
    return trackers;
  } catch (error) {
    console.error("Failed to force refresh trackers:", error);
    // Return current trackers
    return currentTrackers;
  }
}
