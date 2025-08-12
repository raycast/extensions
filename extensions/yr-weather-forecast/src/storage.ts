import { LocalStorage } from "@raycast/api";

export type FavoriteLocation = {
  id?: string;
  name: string;
  lat: number;
  lon: number;
};

const STORAGE_KEY = "favorite-locations";

export async function getFavorites(): Promise<FavoriteLocation[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
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
  } catch {
    return [];
  }
}

async function setFavorites(list: FavoriteLocation[]) {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function sameLocation(a: FavoriteLocation, b: FavoriteLocation): boolean {
  if (a.id && b.id) return a.id === b.id;
  return a.lat === b.lat && a.lon === b.lon;
}

export async function addFavorite(fav: FavoriteLocation): Promise<void> {
  const list = await getFavorites();
  if (!list.some((f) => sameLocation(f, fav))) {
    list.push(fav);
    await setFavorites(list);
  }
}

export async function removeFavorite(fav: FavoriteLocation): Promise<void> {
  const list = await getFavorites();
  const filtered = list.filter((f) => !sameLocation(f, fav));
  await setFavorites(filtered);
}

export async function isFavorite(fav: FavoriteLocation): Promise<boolean> {
  const list = await getFavorites();
  return list.some((f) => sameLocation(f, fav));
}
