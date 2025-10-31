import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";

interface TMDBPreferences {
  tmdbApiToken?: string;
}

interface TMDBFindResponse {
  movie_results: Array<{
    id: number;
    overview: string;
    title: string;
    release_date: string;
  }>;
}

interface TMDBMovieDetails {
  id: number;
  overview: string;
  title: string;
}

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_TIMEOUT_MS = 10000;

/**
 * Find TMDB movie by IMDB ID
 * Returns null if token not configured or lookup fails
 */
export async function findMovieByIMDbId(imdbId: string): Promise<number | null> {
  const preferences = getPreferenceValues<TMDBPreferences>();

  if (!preferences.tmdbApiToken) {
    return null; // Silently skip if no token configured
  }

  if (!imdbId || !imdbId.startsWith("tt")) {
    return null; // Invalid IMDB ID format
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TMDB_TIMEOUT_MS);

    const response = await fetch(`${TMDB_API_BASE}/find/${imdbId}?external_source=imdb_id&language=en-GB`, {
      headers: {
        Authorization: `Bearer ${preferences.tmdbApiToken}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null; // Silently fail
    }

    const data = (await response.json()) as TMDBFindResponse;

    if (!data.movie_results || data.movie_results.length === 0) {
      return null; // No movie found
    }

    return data.movie_results[0].id;
  } catch {
    return null; // Silently fail on any error
  }
}

/**
 * Get movie details including overview
 * Returns null if token not configured or lookup fails
 */
export async function getMovieOverview(tmdbId: number): Promise<string | null> {
  const preferences = getPreferenceValues<TMDBPreferences>();

  if (!preferences.tmdbApiToken) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TMDB_TIMEOUT_MS);

    const response = await fetch(`${TMDB_API_BASE}/movie/${tmdbId}?language=en-GB`, {
      headers: {
        Authorization: `Bearer ${preferences.tmdbApiToken}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as TMDBMovieDetails;

    return data.overview || null;
  } catch {
    return null;
  }
}

/**
 * Convenience function to fetch overview by IMDB ID
 */
export async function fetchOverviewByIMDbId(imdbId: string): Promise<string | null> {
  const tmdbId = await findMovieByIMDbId(imdbId);

  if (!tmdbId) {
    return null;
  }

  return await getMovieOverview(tmdbId);
}
