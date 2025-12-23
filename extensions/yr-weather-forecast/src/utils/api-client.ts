import { getCached, setCached } from "../cache";
import { API_HEADERS, API_CONFIG, buildApiUrl } from "./api-config";
import { DebugLogger } from "./debug-utils";

/**
 * Generic API client for making cached HTTP requests
 * Eliminates duplication between weather and sunrise clients
 */
export class ApiClient {
  private baseUrl: string;
  private cacheKeyPrefix: string;
  private cacheTtl: number;

  constructor(baseUrl: string, cacheKeyPrefix: string, cacheTtl: number) {
    this.baseUrl = baseUrl;
    this.cacheKeyPrefix = cacheKeyPrefix;
    this.cacheTtl = cacheTtl;
  }

  /**
   * Make a cached API request with automatic error handling
   */
  async request<T>(
    params: Record<string, string | number>,
    cacheKeySuffix: string,
    responseTransformer: (data: unknown) => T,
  ): Promise<T> {
    const cacheKey = `${this.cacheKeyPrefix}:${cacheKeySuffix}`;

    // Check cache first
    const cached = await getCached<T>(cacheKey, this.cacheTtl);
    if (cached) return cached;

    // Make API request
    const url = buildApiUrl(this.baseUrl, params);
    const res = await fetch(url, { headers: API_HEADERS });

    if (!res.ok) {
      throw new Error(`API responded ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    // Validate the response data before transforming
    if (!data || typeof data !== "object") {
      throw new Error("Invalid API response: expected object");
    }

    const result = responseTransformer(data);

    // Validate the transformed result
    if (result === undefined || result === null) {
      throw new Error("Response transformer returned invalid result");
    }

    // Cache the result
    await setCached(cacheKey, result);
    return result;
  }

  /**
   * Make a cached API request that can fail gracefully
   */
  async requestSafe<T>(
    params: Record<string, string | number>,
    cacheKeySuffix: string,
    responseTransformer: (data: unknown) => T,
    fallback: T,
  ): Promise<T> {
    try {
      return await this.request(params, cacheKeySuffix, responseTransformer);
    } catch (error) {
      DebugLogger.warn(`API request failed for ${cacheKeySuffix}:`, error);
      return fallback;
    }
  }
}

/**
 * Pre-configured API clients for common endpoints
 */
export const weatherApiClient = new ApiClient(
  "https://api.met.no/weatherapi/locationforecast/2.0/compact",
  "weather",
  API_CONFIG.CACHE_TTL.WEATHER,
);

export const sunriseApiClient = new ApiClient(
  "https://api.met.no/weatherapi/sunrise/3.0/sun",
  "sun",
  API_CONFIG.CACHE_TTL.SUNRISE,
);

// Debug: Log API client initialization
DebugLogger.log("API clients initialized:", {
  weatherApiClient: !!weatherApiClient,
  sunriseApiClient: !!sunriseApiClient,
  weatherApiClientType: typeof weatherApiClient,
  sunriseApiClientType: typeof sunriseApiClient,
});
