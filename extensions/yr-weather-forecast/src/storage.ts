import { LocalStorage } from "@raycast/api";

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

export async function moveFavoriteUp(fav: FavoriteLocation): Promise<void> {
  const list = await getFavorites();
  const index = list.findIndex((f) => sameLocation(f, fav));
  if (index > 0) {
    // Swap with the item above
    [list[index], list[index - 1]] = [list[index - 1], list[index]];
    await setFavorites(list);
  }
}

export async function moveFavoriteDown(fav: FavoriteLocation): Promise<void> {
  const list = await getFavorites();
  const index = list.findIndex((f) => sameLocation(f, fav));
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
