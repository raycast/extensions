// YouTube API client - uses youtube-sr (no API key needed)

import YouTube from "youtube-sr";

export interface VideoResult {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string | null;
  views: number | null;
  channel: string;
  url: string;
  uploadedAt: string | null;
}

export async function searchVideos(query: string): Promise<VideoResult[]> {
  const results = await YouTube.search(query, { limit: 20, type: "video" });

  return results
    .filter((v): v is NonNullable<typeof v> => v !== null && v !== undefined)
    .map((video) => ({
      id: video.id || "",
      title: video.title || "",
      description: video.description || "",
      thumbnail:
        video.thumbnail?.displayThumbnailURL("maxresdefault") ||
        video.thumbnail?.url ||
        "",
      duration: video.durationFormatted || null,
      views: video.views || null,
      channel: video.channel?.name || "",
      url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
      uploadedAt: video.uploadedAt || null,
    }));
}

export async function getTrending(): Promise<VideoResult[]> {
  const trending = await YouTube.trending();

  return trending
    .filter((v): v is NonNullable<typeof v> => v !== null && v !== undefined)
    .map((video) => ({
      id: video.id || "",
      title: video.title || "",
      description: video.description || "",
      thumbnail:
        video.thumbnail?.displayThumbnailURL("maxresdefault") ||
        video.thumbnail?.url ||
        "",
      duration: video.durationFormatted || null,
      views: video.views || null,
      channel: video.channel?.name || "",
      url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
      uploadedAt: video.uploadedAt || null,
    }));
}
