import { LocalStorage } from "@raycast/api";
import { DebugLogger } from "./utils/debug-utils";
import { locationKeyFromIdOrCoords } from "./utils/location-key";

export type FavoriteLocation = {
  id?: string;
  name: string;
  lat: number;
  lon: number;
};

const STORAGE_KEY = "favorite-locations";
const FIRST_TIME_KEY = "first-time-user";

export async function getFavorites(): Promise<FavoriteLocation[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const loaded = parsed
      .map((p) => {
        const obj = p as Partial<FavoriteLocation>;
        return {
          id: typeof obj.id === "string" ? obj.id : undefined,
          name: String(obj.name ?? "Unknown"),
          lat: Number(obj.lat),
          lon: Number(obj.lon),
        } as FavoriteLocation;
      })
      .filter((f) => Number.isFinite(f.lat) && Number.isFinite(f.lon));

    // One-time migration:
    // - ensure every favorite has a canonical id
    // - de-duplicate by canonical id (keep first occurrence deterministically)
    const deduped: FavoriteLocation[] = [];
    const seen = new Set<string>();
    let changed = false;

    for (const fav of loaded) {
      const canonicalId = locationKeyFromIdOrCoords(fav.id, fav.lat, fav.lon);
      if (fav.id !== canonicalId) changed = true;
      const key = canonicalId;
      if (seen.has(key)) {
        changed = true;
        DebugLogger.warn("Duplicate favorite collapsed during migration", {
          keptId: key,
          droppedName: fav.name,
        });
        continue;
      }
      seen.add(key);
      deduped.push({ ...fav, id: canonicalId });
    }

    if (changed) {
      await setFavorites(deduped);
    }

    return deduped;
  } catch {
    return [];
  }
}

async function setFavorites(list: FavoriteLocation[]) {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function sameLocation(a: FavoriteLocation, b: FavoriteLocation): boolean {
  // Canonical identity only — avoids merging nearby-but-distinct locations.
  const aKey = locationKeyFromIdOrCoords(a.id, a.lat, a.lon);
  const bKey = locationKeyFromIdOrCoords(b.id, b.lat, b.lon);
  return aKey === bKey;
}

// Export the sameLocation function for use in other components
export function isSameLocation(a: FavoriteLocation, b: FavoriteLocation): boolean {
  return sameLocation(a, b);
}

export async function addFavorite(fav: FavoriteLocation): Promise<boolean> {
  const list = await getFavorites();
  const canonical = { ...fav, id: locationKeyFromIdOrCoords(fav.id, fav.lat, fav.lon) };
  if (!list.some((f) => sameLocation(f, canonical))) {
    list.push(canonical);
    await setFavorites(list);
    return true; // Successfully added
  }
  return false; // Duplicate found, not added
}

export async function removeFavorite(fav: FavoriteLocation): Promise<void> {
  const list = await getFavorites();
  const canonical = { ...fav, id: locationKeyFromIdOrCoords(fav.id, fav.lat, fav.lon) };
  const filtered = list.filter((f) => !sameLocation(f, canonical));
  await setFavorites(filtered);
}

export async function isFavorite(fav: FavoriteLocation): Promise<boolean> {
  const list = await getFavorites();
  const canonical = { ...fav, id: locationKeyFromIdOrCoords(fav.id, fav.lat, fav.lon) };
  return list.some((f) => sameLocation(f, canonical));
}

export async function moveFavoriteUp(fav: FavoriteLocation): Promise<void> {
  const list = await getFavorites();
  const canonical = { ...fav, id: locationKeyFromIdOrCoords(fav.id, fav.lat, fav.lon) };
  const index = list.findIndex((f) => sameLocation(f, canonical));
  if (index > 0) {
    // Swap with the item above
    [list[index], list[index - 1]] = [list[index - 1], list[index]];
    await setFavorites(list);
  }
}

export async function moveFavoriteDown(fav: FavoriteLocation): Promise<void> {
  const list = await getFavorites();
  const canonical = { ...fav, id: locationKeyFromIdOrCoords(fav.id, fav.lat, fav.lon) };
  const index = list.findIndex((f) => sameLocation(f, canonical));
  if (index >= 0 && index < list.length - 1) {
    // Swap with the item below
    [list[index], list[index + 1]] = [list[index + 1], list[index]];
    await setFavorites(list);
  }
}

export async function isFirstTimeUser(): Promise<boolean> {
  const raw = await LocalStorage.getItem<string>(FIRST_TIME_KEY);
  return raw === null || raw === undefined;
}

export async function markAsNotFirstTime(): Promise<void> {
  await LocalStorage.setItem(FIRST_TIME_KEY, "false");
}
