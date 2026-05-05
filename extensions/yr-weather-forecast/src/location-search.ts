import { API_CONFIG } from "./utils/api-config";
import { locationApiClient } from "./utils/api-client";
import {
  LocationResultSchema,
  NominatimRawSearchResponseSchema,
  type LocationResult as ApiLocationResult,
} from "./api-schemas";

export type LocationResult = ApiLocationResult;

// Simple Nominatim search (OpenStreetMap). Comply with usage policy by sending a UA.
export async function searchLocations(query: string, options?: { signal?: AbortSignal }): Promise<LocationResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const data = await locationApiClient.request(
    {
      format: "json",
      q: trimmed,
      addressdetails: API_CONFIG.NOMINATIM.ADDRESS_DETAILS,
    },
    // Keep cache key short and stable.
    `search:${encodeURIComponent(trimmed.toLowerCase())}`,
    (raw: unknown) => {
      const list = NominatimRawSearchResponseSchema.parse(raw);
      return list.flatMap((p) => {
        const lat = Number(p.lat);
        const lon = Number(p.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
        return [
          LocationResultSchema.parse({
            id: String(p.place_id),
            displayName: p.display_name,
            lat,
            lon,
            address: p.address,
            osm_type: p.osm_type,
            type: p.type,
            class: p.class,
            addresstype: p.addresstype,
          }),
        ];
      });
    },
    { signal: options?.signal, timeoutMs: 10000, retries: 1 },
  );

  return data;
}
