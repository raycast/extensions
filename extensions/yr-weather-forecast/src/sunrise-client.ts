import { getCached, setCached } from "./cache";

const headers = {
  "User-Agent": "raycast-yr-extension/1.0 (https://github.com/kyndig/raycast-yr; contact: raycast@kynd.no)",
};

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

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export async function getSunTimes(lat: number, lon: number, dateISO?: string): Promise<SunTimes> {
  const date = (dateISO ?? new Date().toISOString().slice(0, 10));
  const cacheKey = `sun:${lat.toFixed(3)},${lon.toFixed(3)}:${date}`;
  const cached = await getCached<SunTimes>(cacheKey, SIX_HOURS_MS);
  if (cached) return cached;

  const url = `https://api.met.no/weatherapi/sunrise/3.0/sun?lat=${lat}&lon=${lon}&date=${date}`;
  const res = await fetch(url, { headers });
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
