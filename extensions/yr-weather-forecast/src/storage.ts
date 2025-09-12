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
  // Check for exact ID match first (most reliable)
  if (a.id && b.id && a.id === b.id) {
    console.log(`sameLocation: Exact ID match`, { a: a.name, b: b.name, id: a.id });
    return true;
  }

  // Check coordinate proximity (within ~1km)
  const coordinatesMatch = Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;

  // Check name similarity for city-level matching
  const nameSimilarity = calculateNameSimilarity(a.name, b.name);
  const nameMatch = nameSimilarity > 0.7; // 70% similarity threshold

  // Only log when there's a potential match or interesting case
  if (coordinatesMatch || nameSimilarity > 0.3) {
    console.log(`sameLocation check:`, {
      a: { name: a.name, lat: a.lat, lon: a.lon, id: a.id },
      b: { name: b.name, lat: b.lat, lon: b.lon, id: b.id },
      coordinatesMatch,
      nameSimilarity: nameSimilarity.toFixed(3),
      nameMatch,
      latDiff: Math.abs(a.lat - b.lat),
      lonDiff: Math.abs(a.lon - b.lon),
    });
  }

  // Match if both coordinates are close AND names are similar
  return coordinatesMatch && nameMatch;
}

function calculateNameSimilarity(name1: string, name2: string): number {
  // Normalize names: lowercase, remove common suffixes, split into words
  const normalize = (name: string) => {
    return name
      .toLowerCase()
      .replace(/,\s*(norge|norway|sverige|sweden|danmark|denmark|finland|suomi|island|iceland)$/i, "")
      .replace(/,\s*[^,]+$/, "") // Remove last comma part (often administrative division)
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 2); // Filter out short words
  };

  const words1 = normalize(name1);
  const words2 = normalize(name2);

  if (words1.length === 0 || words2.length === 0) return 0;

  // Calculate Jaccard similarity (intersection over union)
  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

// Export the sameLocation function for use in other components
export function isSameLocation(a: FavoriteLocation, b: FavoriteLocation): boolean {
  return sameLocation(a, b);
}

export async function addFavorite(fav: FavoriteLocation): Promise<boolean> {
  const list = await getFavorites();
  if (!list.some((f) => sameLocation(f, fav))) {
    list.push(fav);
    await setFavorites(list);
    return true; // Successfully added
  }
  return false; // Duplicate found, not added
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
