import { weatherApiClient } from "./utils/api-client";
import { coordSuffix } from "./cache-keys";
import { LocationForecastResponseSchema, type TimeseriesEntry as ApiTimeseriesEntry } from "./api-schemas";

export type TimeseriesEntry = ApiTimeseriesEntry;

export type WeatherDataWithMetadata = {
  data: TimeseriesEntry | TimeseriesEntry[];
  metadata: {
    updated_at?: string;
    last_modified?: string;
    expires?: string;
  };
};

export async function getWeather(
  lat: number,
  lon: number,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<TimeseriesEntry> {
  const result = await getWeatherWithMetadata(lat, lon, options);
  return result.data as TimeseriesEntry;
}

export async function getWeatherWithMetadata(
  lat: number,
  lon: number,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<WeatherDataWithMetadata> {
  const cacheKeySuffix = `current-meta:${coordSuffix(lat, lon)}`;
  return weatherApiClient.request(
    { lat, lon },
    cacheKeySuffix,
    (raw: unknown, response: Response) => {
      const data = LocationForecastResponseSchema.parse(raw);
      const first = data.properties?.timeseries?.[0];
      if (!first) throw new Error("Unexpected response shape: missing timeseries[0]");
      return {
        data: first,
        metadata: {
          updated_at: data.meta?.updated_at,
          last_modified: response.headers.get("Last-Modified") || undefined,
          expires: response.headers.get("Expires") || undefined,
        },
      };
    },
    { signal: options?.signal, timeoutMs: options?.timeoutMs ?? 10000, retries: 1 },
  );
}

export async function getForecast(
  lat: number,
  lon: number,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<TimeseriesEntry[]> {
  const result = await getForecastWithMetadata(lat, lon, options);
  return result.data as TimeseriesEntry[];
}

export async function getForecastWithMetadata(
  lat: number,
  lon: number,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<WeatherDataWithMetadata> {
  const cacheKeySuffix = `forecast-meta:${coordSuffix(lat, lon)}`;
  return weatherApiClient.request(
    { lat, lon },
    cacheKeySuffix,
    (raw: unknown, response: Response) => {
      const data = LocationForecastResponseSchema.parse(raw);
      const series = data.properties?.timeseries;
      if (!Array.isArray(series)) throw new Error("Unexpected response shape: missing timeseries array");
      return {
        data: series,
        metadata: {
          updated_at: data.meta?.updated_at,
          last_modified: response.headers.get("Last-Modified") || undefined,
          expires: response.headers.get("Expires") || undefined,
        },
      };
    },
    { signal: options?.signal, timeoutMs: options?.timeoutMs ?? 10000, retries: 1 },
  );
}
