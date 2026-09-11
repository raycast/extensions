import { LocalStorage } from "@raycast/api";
import { CachedData } from "./types";

/**
 * Read cached data from LocalStorage.
 */
export async function readCache<T>(key: string): Promise<CachedData<T> | null> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedData<T>;
  } catch {
    return null;
  }
}

/**
 * Write data to cache with a timestamp.
 */
export async function writeCache<T>(key: string, data: T): Promise<void> {
  const entry: CachedData<T> = {
    data,
    timestamp: new Date().toISOString(),
  };
  await LocalStorage.setItem(key, JSON.stringify(entry));
}
