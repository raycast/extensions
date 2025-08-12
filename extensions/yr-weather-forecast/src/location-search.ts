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
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=10&addressdetails=0`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "raycast-yr-extension/1.0 (github.com/holene; contact: axel@kynd.no)",
    },
  });
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
