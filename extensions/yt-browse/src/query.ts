import { QueryClient } from "@tanstack/react-query";
import { LocalStorage } from "@raycast/api";
import { VideoResult, searchVideos, getTrending } from "./youtube-api";
import { fetchRealHistory, HistoryVideo } from "./webapp";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const TRENDING_QUERIES = [
  "viral video",
  "trending music",
  "funny moments",
  "highlights",
  "tutorial",
  "podcast",
  "reaction",
  "review",
];

export const historyKey = ["youtube", "real-history"];
export const trendingKey = ["youtube", "trending"];

async function cacheToStorage<T>(key: string, items: T[]): Promise<void> {
  try {
    await LocalStorage.setItem(key, JSON.stringify(items));
    await LocalStorage.setItem(`${key}-time`, Date.now().toString());
  } catch {
    // ignore
  }
}

async function loadFromStorage<T>(key: string): Promise<T[] | null> {
  try {
    const cached = await LocalStorage.getItem<string>(key);
    if (!cached) return null;
    return JSON.parse(cached) as T[];
  } catch {
    return null;
  }
}

async function fetchVideoList(
  queries: string[],
  storageKey: string,
): Promise<VideoResult[]> {
  const allResults = await Promise.all(
    queries.map((q) => searchVideos(q).catch(() => [] as VideoResult[])),
  );

  const allVideos: VideoResult[] = [];
  const seen = new Set<string>();
  for (const res of allResults) {
    for (const video of res) {
      if (video.id && !seen.has(video.id)) {
        seen.add(video.id);
        allVideos.push(video);
        if (allVideos.length >= 20) break;
      }
    }
    if (allVideos.length >= 20) break;
  }

  await cacheToStorage(storageKey, allVideos);
  return allVideos;
}

/**
 * Fetch real watch history via Safari JS, cache to LocalStorage.
 * Falls back to cached data if Safari JS fails.
 */
export async function fetchHistory(): Promise<HistoryVideo[]> {
  try {
    const history = await fetchRealHistory();
    if (history.length > 0) {
      await cacheToStorage("youtube-history-cache", history);
      return history;
    }
  } catch {
    // Safari JS failed — try cache
  }
  // Return cached data if fetch failed
  const cached = await loadFromStorage<HistoryVideo>("youtube-history-cache");
  return cached ?? [];
}

export async function fetchTrending(): Promise<VideoResult[]> {
  try {
    const trending = await getTrending();
    if (trending.length > 0) {
      await cacheToStorage("youtube-trending-cache", trending);
      return trending;
    }
  } catch {
    // fall through to search-based trending
  }
  return fetchVideoList(TRENDING_QUERIES, "youtube-trending-cache");
}

export async function getHistoryFromCache(): Promise<HistoryVideo[] | null> {
  return loadFromStorage<HistoryVideo>("youtube-history-cache");
}

export async function getTrendingFromCache(): Promise<VideoResult[] | null> {
  return loadFromStorage<VideoResult>("youtube-trending-cache");
}
