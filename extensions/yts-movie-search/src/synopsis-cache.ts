import { LocalStorage } from "@raycast/api";

interface CachedSynopsis {
  imdbId: string;
  overview: string;
  cachedAt: string; // ISO timestamp
}

const CACHE_KEY_PREFIX = "tmdb-synopsis-";
const CACHE_DURATION_DAYS = 90;

/**
 * Get cached synopsis for a movie
 * Returns null if not cached or cache expired
 */
export async function getCachedSynopsis(imdbId: string): Promise<string | null> {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${imdbId}`;
    const cached = await LocalStorage.getItem<string>(cacheKey);

    if (!cached) {
      return null;
    }

    const data = JSON.parse(cached) as CachedSynopsis;

    // Check if cache is expired (90 days)
    const cachedDate = new Date(data.cachedAt);
    const expiryDate = new Date(cachedDate.getTime() + CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();

    if (now > expiryDate) {
      // Cache expired, remove it
      await LocalStorage.removeItem(cacheKey);
      return null;
    }

    return data.overview;
  } catch {
    return null; // Silently fail
  }
}

/**
 * Cache synopsis for a movie
 */
export async function setCachedSynopsis(imdbId: string, overview: string): Promise<void> {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${imdbId}`;
    const data: CachedSynopsis = {
      imdbId,
      overview,
      cachedAt: new Date().toISOString(),
    };

    await LocalStorage.setItem(cacheKey, JSON.stringify(data));
  } catch {
    // Silently fail if caching fails
  }
}

/**
 * Get synopsis with fallback to TMDB
 * First checks cache, then fetches from TMDB if needed
 */
export async function getSynopsisWithFallback(
  imdbId: string,
  fetchFunction: () => Promise<string | null>,
): Promise<string | null> {
  // Check cache first
  const cached = await getCachedSynopsis(imdbId);
  if (cached) {
    return cached;
  }

  // Fetch from TMDB
  const overview = await fetchFunction();

  if (overview) {
    // Cache the result
    await setCachedSynopsis(imdbId, overview);
  }

  return overview;
}
