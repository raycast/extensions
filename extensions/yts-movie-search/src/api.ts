import fetch from "node-fetch";
import { SearchResponse, MovieDetailsResponse, SortBy, MovieQuality, Genre } from "./types";
import { CONFIG } from "./constants";

function validateSearchResponse(data: unknown): SearchResponse {
  if (!data || typeof data.status !== "string") {
    throw new Error("Invalid API response: missing status");
  }
  if (!data.data || typeof data.data !== "object") {
    throw new Error("Invalid API response: missing data object");
  }

  // YTS API returns movies as null when there are no results
  // Normalize to empty array for consistent handling
  if (data.data.movies === null || data.data.movies === undefined) {
    data.data.movies = [];
  }

  if (!Array.isArray(data.data.movies)) {
    throw new Error("Invalid API response: movies should be an array");
  }

  return data as SearchResponse;
}

function validateMovieDetailsResponse(data: unknown): MovieDetailsResponse {
  if (!data || typeof data.status !== "string") {
    throw new Error("Invalid API response: missing status");
  }
  if (!data.data || !data.data.movie) {
    throw new Error("Invalid API response: missing movie data");
  }
  return data as MovieDetailsResponse;
}

const API_BASE = CONFIG.api.baseUrl;

export interface SearchParams {
  query?: string;
  quality?: MovieQuality;
  genre?: Genre;
  sortBy?: SortBy;
  page?: number;
  limit?: number;
  minimum_rating?: number;
}

export async function searchMovies(params: SearchParams, options?: { signal?: AbortSignal }): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();

  if (params.query) {
    searchParams.append("query_term", params.query);
  }

  if (params.quality && params.quality !== "all") {
    searchParams.append("quality", params.quality);
  }

  if (params.genre && params.genre !== "All") {
    searchParams.append("genre", params.genre.toLowerCase());
  }

  if (params.minimum_rating && params.minimum_rating > 0) {
    searchParams.append("minimum_rating", params.minimum_rating.toString());
  }

  searchParams.append("sort_by", params.sortBy || "download_count");
  searchParams.append("page", (params.page || 1).toString());
  searchParams.append("limit", (params.limit || 100).toString());

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), CONFIG.api.timeoutMs);

  try {
    const response = await fetch(`${API_BASE}/list_movies.json?${searchParams}`, {
      signal: options?.signal || timeoutController.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to search movies: ${response.statusText}`);
    }

    const data = await response.json();
    return validateSearchResponse(data);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      if (timeoutController.signal.aborted) {
        throw new Error("Request timed out. Please try again.");
      }
      throw error; // Re-throw if aborted by user
    }
    throw error;
  }
}

export async function getMovieDetails(movieId: number): Promise<MovieDetailsResponse> {
  const params = new URLSearchParams({
    movie_id: movieId.toString(),
  });

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), CONFIG.api.timeoutMs);

  try {
    const response = await fetch(`${API_BASE}/movie_details.json?${params}`, {
      signal: timeoutController.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to get movie details: ${response.statusText}`);
    }

    const data = await response.json();
    return validateMovieDetailsResponse(data);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      if (timeoutController.signal.aborted) {
        throw new Error("Request timed out. Please try again.");
      }
      throw error;
    }
    throw error;
  }
}
