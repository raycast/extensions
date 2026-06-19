import { LocalStorage } from "@raycast/api";
import { RecentTicker } from "./types";

export const RECENTS_KEY = "recent-tickers";
const MAX_RECENTS = 10;

export async function addToRecents(symbol: string, name: string) {
  const stored = await LocalStorage.getItem<string>(RECENTS_KEY);
  const recents: RecentTicker[] = stored ? JSON.parse(stored) : [];
  const filtered = recents.filter((r) => r.symbol !== symbol);
  filtered.unshift({ symbol, name, timestamp: Date.now() });
  const trimmed = filtered.slice(0, MAX_RECENTS);
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(trimmed));
}

export async function getRecents(): Promise<RecentTicker[]> {
  const stored = await LocalStorage.getItem<string>(RECENTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export async function removeRecent(symbol: string): Promise<RecentTicker[]> {
  const current = await getRecents();
  const filtered = current.filter((r) => r.symbol !== symbol);
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(filtered));
  return filtered;
}

export async function clearRecents() {
  await LocalStorage.removeItem(RECENTS_KEY);
}
