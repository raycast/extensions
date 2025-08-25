import { getCached, setCached } from "./cache";
import { API_HEADERS, API_ENDPOINTS, API_CONFIG, buildApiUrl } from "./utils/api-config";

export type SunTimes = {
  sunrise?: string; // ISO time
  sunset?: string; // ISO time
};

type SunriseApiResponse = {
  properties?: {
    sunrise?: { time?: string };
    sunset?: { time?: string };
  };
};

export async function getSunTimes(lat: number, lon: number, dateISO?: string): Promise<SunTimes> {
  const dateRaw = dateISO ?? new Date().toISOString().slice(0, 10);
  const date = dateRaw.includes("T") ? dateRaw.split("T")[0] : dateRaw;
  const cacheKey = `sun:${lat.toFixed(3)},${lon.toFixed(3)}:${date}`;
  const cached = await getCached<SunTimes>(cacheKey, API_CONFIG.CACHE_TTL.SUNRISE);
  if (cached) return cached;

  const url = buildApiUrl(API_ENDPOINTS.MET.SUNRISE_SUNSET, { lat, lon, date });
  const res = await fetch(url, { headers: API_HEADERS });
  if (!res.ok) {
    // Don't throw; return empty so UI can continue
    return {};
  }
  const data = (await res.json()) as SunriseApiResponse;
  const sunrise = data.properties?.sunrise?.time;
  const sunset = data.properties?.sunset?.time;
  const result: SunTimes = { sunrise, sunset };
  await setCached(cacheKey, result);
  return result;
}
