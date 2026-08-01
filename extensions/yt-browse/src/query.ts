import { QueryClient } from "@tanstack/react-query";
import { LocalStorage } from "@raycast/api";
import { VideoResult, searchVideos, getTrending } from "./youtube-api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const HISTORY_QUERIES = [
  "lofi hip hop",
  "music 2024",
  "gaming highlights",
  "tech reviews",
  "cooking",
  "workout",
  "documentary",
  "movie trailer",
];

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

export const historyKey = ["youtube", "history"];
export const trendingKey = ["youtube", "trending"];

async function cacheToStorage(
  key: string,
  items: VideoResult[],
): Promise<void> {
  try {
    await LocalStorage.setItem(key, JSON.stringify(items));
    await LocalStorage.setItem(`${key}-time`, Date.now().toString());
  } catch {
    // ignore
  }
}

async function loadFromStorage(key: string): Promise<VideoResult[] | null> {
  try {
    const cached = await LocalStorage.getItem<string>(key);
    if (!cached) return null;
    return JSON.parse(cached) as VideoResult[];
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

export async function fetchHistory(): Promise<VideoResult[]> {
  return fetchVideoList(HISTORY_QUERIES, "youtube-history-cache");
}

export async function fetchTrending(): Promise<VideoResult[]> {
  // Try the real trending endpoint first, fall back to search
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

export async function getHistoryFromCache(): Promise<VideoResult[] | null> {
  return loadFromStorage("youtube-history-cache");
}

export async function getTrendingFromCache(): Promise<VideoResult[] | null> {
  return loadFromStorage("youtube-trending-cache");
}
