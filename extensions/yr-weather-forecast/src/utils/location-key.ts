/**
 * Canonical location identity utilities.
 *
 * Goal: provide a single stable key used across favorites, caches, and UI keys.
 *
 * - Prefer stable upstream IDs (e.g. Nominatim place_id) when available.
 * - Fall back to a namespaced coordinate key with fixed precision.
 */
export type LocationKey = string;

export const COORD_PRECISION = 3;

function coordPart(n: number): string {
  return n.toFixed(COORD_PRECISION);
}

export function locationKeyFromCoords(lat: number, lon: number): LocationKey {
  return `coord:${coordPart(lat)},${coordPart(lon)}`;
}

function looksLikeLatLonPair(id: string): { lat: number; lon: number } | null {
  const parts = id.split(",").map((p) => p.trim());
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function normalizePrefixedId(id: string, lat: number, lon: number): LocationKey | null {
  const match = id.match(/^([a-zA-Z]+):(.*)$/);
  if (!match) return null;

  const prefix = match[1].toLowerCase();
  const payload = match[2].trim();
  if (!payload) return locationKeyFromCoords(lat, lon);

  if (prefix === "osm") {
    return /^\d+$/.test(payload) ? `osm:${payload}` : locationKeyFromCoords(lat, lon);
  }

  if (prefix === "coord") {
    const pair = looksLikeLatLonPair(payload);
    return pair ? locationKeyFromCoords(pair.lat, pair.lon) : locationKeyFromCoords(lat, lon);
  }

  if (prefix === "id") {
    return `id:${payload}`;
  }

  return null;
}

/**
 * Convert any legacy/loose ID + coordinates into a canonical key.
 *
 * Important: we do NOT require callers to pre-prefix IDs. This function
 * canonicalizes common legacy formats used in this repo:
 * - Raw Nominatim place_id string/number -> `osm:${id}`
 * - Prefixed IDs (`OSM:`, `coord:`, `id:`) -> normalized lowercase canonical keys
 * - Raw `"lat,lon"` strings -> `coord:...` (rounded)
 * - `favorite-<lat>-<lon>` -> treated as coord fallback
 * - Malformed prefixed IDs -> deterministic coordinate fallback
 */
export function locationKeyFromIdOrCoords(id: string | undefined, lat: number, lon: number): LocationKey {
  const normalizedInput = id?.trim();
  if (normalizedInput) {
    const prefixed = normalizePrefixedId(normalizedInput, lat, lon);
    if (prefixed) return prefixed;

    // Internal/legacy placeholder used in forecast view
    if (normalizedInput.startsWith("favorite-")) {
      return locationKeyFromCoords(lat, lon);
    }

    // Legacy coordinate string IDs
    const pair = looksLikeLatLonPair(normalizedInput);
    if (pair) {
      return locationKeyFromCoords(pair.lat, pair.lon);
    }

    // Nominatim place_id is numeric (stringified); treat as stable OSM/Nominatim ID.
    if (/^\d+$/.test(normalizedInput)) {
      return `osm:${normalizedInput}`;
    }

    // Fallback for any other external id
    return `id:${normalizedInput}`;
  }

  return locationKeyFromCoords(lat, lon);
}
