import { Cache, getPreferenceValues } from "@raycast/api";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

interface GeocodeResult extends Coordinates {
  // Full place name as found by OpenStreetMap, e.g. "21, Quellengasse, Schwarzach, Vorarlberg, 6858, Österreich"
  displayName?: string;
}

const geocodeCache = new Cache();

// "47.4486, 9.7621", "47.4486 9.7621" or "47.4486;9.7621" (as copied from Google Maps)
const parseCoordinates = (value: string): Coordinates | null => {
  const match = value.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const latitude = parseFloat(match[1]);
  const longitude = parseFloat(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
};

// Looks up an address with OpenStreetMap (Nominatim) and caches the result, so it is requested only once.
// `fresh` skips the cache (used by the settings check)
const geocode = async (address: string, fresh = false): Promise<GeocodeResult | null> => {
  const cacheKey = `geocode:${address.toLowerCase()}`;
  const cached = fresh ? undefined : geocodeCache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const response = await fetch(url, { headers: { "User-Agent": "raycast-zemtu-extension" } });
  if (!response.ok) throw new Error(`Address lookup failed: ${response.status}`);

  const [result] = (await response.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
  if (!result) return null;

  const coordinates: GeocodeResult = {
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    displayName: result.display_name,
  };
  geocodeCache.set(cacheKey, JSON.stringify(coordinates));
  return coordinates;
};

export const getLocationPreference = () => getPreferenceValues<Preferences>().location?.trim() ?? "";

/**
 * The user's location from the preferences (address or coordinates), or null if none is set
 * or the address can't be found.
 */
export const resolveLocation = async (location = getLocationPreference()): Promise<Coordinates | null> => {
  if (!location) return null;
  return parseCoordinates(location) ?? geocode(location);
};

/**
 * Like resolveLocation, but always asks OpenStreetMap again and says how the location was understood.
 */
export const checkLocation = async (location: string) => {
  const coordinates = parseCoordinates(location);
  if (coordinates) return { type: "coordinates" as const, ...coordinates };
  const result = await geocode(location, true);
  return result ? { type: "address" as const, ...result } : null;
};
