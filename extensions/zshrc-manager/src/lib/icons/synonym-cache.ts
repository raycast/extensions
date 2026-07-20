/**
 * Icon Synonym Cache
 *
 * Caches icon synonyms from the manifest for use in section name normalization.
 * Provides synchronous access to synonyms with async initialization.
 */

import { LocalStorage } from "@raycast/api";

const SYNONYMS_CACHE_KEY = "icon-synonyms-cache";

/**
 * In-memory cache of icon synonyms
 */
let synonymsCache: Record<string, string> = {};
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize the cache from LocalStorage
 * Called once on module load
 */
async function initializeCache(): Promise<void> {
  try {
    const cached = await LocalStorage.getItem<string>(SYNONYMS_CACHE_KEY);
    if (cached) {
      synonymsCache = JSON.parse(cached);
    }
  } catch {
    // Ignore errors, use empty cache
  }
}

/**
 * Ensures the cache is initialized before use.
 * Safe to call multiple times - will only initialize once.
 */
export async function ensureCacheInitialized(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initializeCache();
  }
  return initializationPromise;
}

// Initialize cache on module load
ensureCacheInitialized();

/**
 * Update the synonyms cache with new data from manifest
 */
export async function updateSynonymsCache(synonyms: Record<string, string>): Promise<void> {
  synonymsCache = synonyms;
  try {
    await LocalStorage.setItem(SYNONYMS_CACHE_KEY, JSON.stringify(synonyms));
  } catch {
    // Ignore LocalStorage errors - in-memory cache is still updated
  }
}

/**
 * Get the current synonyms (synchronous access to cached data)
 */
export function getSynonyms(): Record<string, string> {
  return synonymsCache;
}

/**
 * Apply synonyms to normalize a section name
 */
export function applySynonyms(name: string): string {
  const lower = name.toLowerCase();

  // Check for exact match first
  if (synonymsCache[lower]) {
    return synonymsCache[lower];
  }

  // Check each synonym for word boundary match
  for (const [synonym, canonical] of Object.entries(synonymsCache)) {
    const regex = new RegExp(`\\b${escapeRegExp(synonym)}\\b`, "i");
    if (regex.test(name)) {
      return name.toLowerCase().replace(regex, canonical);
    }
  }

  return name.toLowerCase();
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
