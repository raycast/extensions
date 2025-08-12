import { getCached, setCached } from "./cache";

const THIRTY_MIN_MS = 30 * 60 * 1000;
const headers = {
  "User-Agent": "raycast-yr-extension/1.0 (https://github.com/kyndig/raycast-yr; contact: raycast@kynd.no)",
};

export type TimeseriesEntry = {
  time: string;
  data: {
    instant: {
      details: Record<string, number> & {
        air_temperature?: number;
        wind_speed?: number;
        wind_from_direction?: number; // degrees
      };
    };
    next_1_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number };
    };
    next_6_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number };
    };
    next_12_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number };
    };
  };
};

type LocationForecastResponse = {
  properties?: {
    timeseries?: unknown[];
  };
};

export async function getWeather(lat: number, lon: number): Promise<TimeseriesEntry> {
  const cacheKey = `weather:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = await getCached<TimeseriesEntry>(cacheKey, THIRTY_MIN_MS);
  if (cached) return cached;
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`met.no responded ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as LocationForecastResponse;
  const first = data.properties?.timeseries?.[0] as unknown;
  if (!first) {
    throw new Error("Unexpected response shape: missing timeseries[0]");
  }
  const ts = first as TimeseriesEntry;
  await setCached(cacheKey, ts);
  return ts;
}

export async function getForecast(lat: number, lon: number): Promise<TimeseriesEntry[]> {
  const cacheKey = `forecast:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = await getCached<TimeseriesEntry[]>(cacheKey, THIRTY_MIN_MS);
  if (cached) return cached;
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`met.no responded ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as LocationForecastResponse;
  const series = data.properties?.timeseries as unknown;
  if (!Array.isArray(series)) {
    throw new Error("Unexpected response shape: missing timeseries array");
  }
  const list = series as TimeseriesEntry[];
  await setCached(cacheKey, list);
  return list;
}
