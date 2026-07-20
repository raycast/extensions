import { sunriseApiClient } from "./utils/api-client";
import { coordSuffix } from "./cache-keys";
import { SunriseApiResponseSchema, SunTimesSchema, type SunTimes } from "./api-schemas";

export type { SunTimes };

export async function getSunTimes(lat: number, lon: number, dateISO?: string): Promise<SunTimes> {
  const dateRaw = dateISO ?? new Date().toISOString().slice(0, 10);
  const date = dateRaw.includes("T") ? dateRaw.split("T")[0] : dateRaw;
  const cacheKeySuffix = `${coordSuffix(lat, lon)}:${date}`;

  return sunriseApiClient.requestSafe(
    { lat, lon, date },
    cacheKeySuffix,
    (data: unknown) => {
      const typedData = SunriseApiResponseSchema.parse(data);
      const sunrise = typedData.properties?.sunrise?.time;
      const sunset = typedData.properties?.sunset?.time;
      return SunTimesSchema.parse({ sunrise, sunset });
    },
    { sunrise: undefined, sunset: undefined }, // Return empty object as fallback
  );
}
