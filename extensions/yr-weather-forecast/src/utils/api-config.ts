/**
 * Centralized API configuration for all external API calls
 * This consolidates headers, constants, and configuration used across multiple API clients
 */

/**
 * Common User-Agent header for all API requests
 * Complies with usage policies for external APIs
 */
export const API_HEADERS = {
  "User-Agent": "raycast-yr-extension/1.0 (https://github.com/kyndig/raycast-yr; contact: raycast@kynd.no)",
} as const;

/**
 * API endpoints and base URLs
 */
export const API_ENDPOINTS = {
  // Norwegian Meteorological Institute (MET) API
  MET: {
    WEATHER_FORECAST: "https://api.met.no/weatherapi/locationforecast/2.0/compact",
    SUNRISE_SUNSET: "https://api.met.no/weatherapi/sunrise/3.0/sun",
  },
  // OpenStreetMap Nominatim API for location search
  NOMINATIM: {
    SEARCH: "https://nominatim.openstreetmap.org/search",
  },
} as const;

/**
 * API request configuration constants
 */
export const API_CONFIG = {
  // Request limits and timeouts
  NOMINATIM: {
    ADDRESS_DETAILS: 0,
  },
  // Cache TTL values (in milliseconds)
  CACHE_TTL: {
    WEATHER: 30 * 60 * 1000, // 30 minutes
    SUNRISE: 6 * 60 * 60 * 1000, // 6 hours
  },
} as const;

/**
 * Helper function to build complete API headers
 * Allows for additional headers to be merged with defaults
 */
export function buildApiHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    ...API_HEADERS,
    ...additionalHeaders,
  };
}

/**
 * Helper function to build API URLs with query parameters
 */
export function buildApiUrl(baseUrl: string, params: Record<string, string | number>): string {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  return url.toString();
}
