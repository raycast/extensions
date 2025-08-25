import { API_HEADERS, API_ENDPOINTS, API_CONFIG, buildApiUrl } from "./utils/api-config";

export type LocationResult = {
  id: string;
  displayName: string;
  lat: number;
  lon: number;
};

// Simple Nominatim search (OpenStreetMap). Comply with usage policy by sending a UA.
export async function searchLocations(query: string): Promise<LocationResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = buildApiUrl(API_ENDPOINTS.NOMINATIM.SEARCH, {
    format: "json",
    q: trimmed,
    addressdetails: API_CONFIG.NOMINATIM.ADDRESS_DETAILS,
  });

  const res = await fetch(url, { headers: API_HEADERS });
  if (!res.ok) {
    throw new Error(`nominatim responded ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as Array<{
    place_id: number | string;
    display_name: string;
    lat: string;
    lon: string;
  }>;
  return data.map((p) => ({
    id: String(p.place_id),
    displayName: p.display_name,
    lat: Number(p.lat),
    lon: Number(p.lon),
  }));
}
