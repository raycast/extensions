import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  youtubeApiKey: string;
}

interface YouTubeApiResponse {
  items?: unknown[];
  error?: {
    message: string;
  };
}

interface YouTubeSearchItem {
  id?: {
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
}

interface YouTubeVideo {
  id: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      medium?: {
        url?: string;
      };
    };
  };
  contentDetails?: {
    duration?: string;
  };
  statistics?: {
    viewCount?: string;
  };
}

interface YouTubeChannel {
  id: string;
  snippet?: {
    title?: string;
    thumbnails?: {
      medium?: {
        url?: string;
      };
    };
    description?: string;
  };
  statistics?: {
    subscriberCount?: string;
    videoCount?: string;
  };
}

interface YouTubePlaylist {
  id: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      medium?: {
        url?: string;
      };
    };
  };
  contentDetails?: {
    itemCount?: number;
  };
}

interface YouTubePlaylistItem {
  snippet?: {
    resourceId?: {
      videoId?: string;
    };
  };
}

const BASE_URL = "https://www.googleapis.com/youtube/v3";

function getApiKey(): string {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.youtubeApiKey) {
    throw new Error("YouTube API key is not configured. Please add it in extension preferences.");
  }

  return preferences.youtubeApiKey;
}

async function fetchFromYouTube(
  endpoint: string,
  params: Record<string, string | number>,
): Promise<YouTubeApiResponse> {
  const apiKey = getApiKey();
  const urlParams = new URLSearchParams({
    ...params,
    key: apiKey,
  } as Record<string, string>);

  const response = await fetch(`${BASE_URL}${endpoint}?${urlParams}`);

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: { message: "Unknown error" } }))) as {
      error?: { message: string };
    };
    throw new Error(error.error?.message || `API request failed: ${response.statusText}`);
  }

  return (await response.json()) as YouTubeApiResponse;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  url: string;
}

export interface Artist {
  id: string;
  name: string;
  thumbnail: string;
  url: string;
  subscriberCount?: string;
  subscriberCountRaw?: number;
  description?: string;
  videoCount?: string;
}

export interface Playlist {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  itemCount?: number;
  channelTitle?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  url: string;
  itemCount?: number;
  popularity?: number; // View count for sorting
}

function formatDuration(duration: string): string {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return "";

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatSubscriberCount(count: string): string {
  const num = parseInt(count);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M subscribers`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K subscribers`;
  }
  return `${num} subscribers`;
}

export async function searchSongs(query: string): Promise<Song[]> {
  try {
    const searchData = await fetchFromYouTube("/search", {
      part: "snippet",
      q: query,
      type: "video",
      videoCategoryId: "10", // Music category
      maxResults: 25,
    });

    if (!searchData.items || searchData.items.length === 0) return [];

    const videoIds = (searchData.items as YouTubeSearchItem[])
      .map((item) => item.id?.videoId)
      .filter((id): id is string => !!id)
      .join(",");

    const videosData = await fetchFromYouTube("/videos", {
      part: "snippet,contentDetails",
      id: videoIds,
    });

    if (!videosData.items) return [];

    return (videosData.items as YouTubeVideo[]).map((video) => ({
      id: video.id || "",
      title: video.snippet?.title || "Unknown Title",
      artist: video.snippet?.channelTitle || "Unknown Artist",
      thumbnail: video.snippet?.thumbnails?.medium?.url || "",
      duration: formatDuration(video.contentDetails?.duration || ""),
      url: `https://music.youtube.com/watch?v=${video.id}`,
    }));
  } catch (error) {
    console.error("Error searching songs:", error);
    if (error instanceof Error && error.message.includes("API key")) {
      throw error;
    }
    throw new Error("Failed to search songs. Please check your API key and internet connection.");
  }
}

export async function searchArtists(query: string): Promise<Artist[]> {
  try {
    const searchData = await fetchFromYouTube("/search", {
      part: "snippet",
      q: query,
      type: "channel",
      maxResults: 25,
    });

    if (!searchData.items || searchData.items.length === 0) return [];

    const channelIds = (searchData.items as YouTubeSearchItem[])
      .map((item) => item.id?.channelId)
      .filter((id): id is string => !!id)
      .join(",");

    const channelsData = await fetchFromYouTube("/channels", {
      part: "snippet,statistics",
      id: channelIds,
    });

    if (!channelsData.items) return [];

    const artists = (channelsData.items as YouTubeChannel[]).map((channel) => ({
      id: channel.id || "",
      name: channel.snippet?.title || "Unknown Artist",
      thumbnail: channel.snippet?.thumbnails?.medium?.url || "",
      url: `https://music.youtube.com/channel/${channel.id}`,
      subscriberCount: channel.statistics?.subscriberCount
        ? formatSubscriberCount(channel.statistics.subscriberCount)
        : undefined,
      subscriberCountRaw: channel.statistics?.subscriberCount ? parseInt(channel.statistics.subscriberCount) : 0,
      description: channel.snippet?.description,
      videoCount: channel.statistics?.videoCount || "0",
    }));

    // Sort by subscriber count (most popular first)
    return artists.sort((a, b) => (b.subscriberCountRaw || 0) - (a.subscriberCountRaw || 0));
  } catch (error) {
    console.error("Error searching artists:", error);
    if (error instanceof Error && error.message.includes("API key")) {
      throw error;
    }
    throw new Error("Failed to search artists. Please check your API key and internet connection.");
  }
}

export async function searchPlaylists(query: string): Promise<Playlist[]> {
  try {
    const searchData = await fetchFromYouTube("/search", {
      part: "snippet",
      q: query,
      type: "playlist",
      maxResults: 25,
    });

    if (!searchData.items || searchData.items.length === 0) return [];

    const playlistIds = (searchData.items as YouTubeSearchItem[])
      .map((item) => item.id?.playlistId)
      .filter((id): id is string => !!id)
      .join(",");

    const playlistsData = await fetchFromYouTube("/playlists", {
      part: "snippet,contentDetails",
      id: playlistIds,
    });

    if (!playlistsData.items) return [];

    return (playlistsData.items as YouTubePlaylist[]).map((playlist) => ({
      id: playlist.id || "",
      title: playlist.snippet?.title || "Unknown Playlist",
      thumbnail: playlist.snippet?.thumbnails?.medium?.url || "",
      url: `https://music.youtube.com/playlist?list=${playlist.id}`,
      itemCount: playlist.contentDetails?.itemCount || undefined,
      channelTitle: playlist.snippet?.channelTitle,
    }));
  } catch (error) {
    console.error("Error searching playlists:", error);
    if (error instanceof Error && error.message.includes("API key")) {
      throw error;
    }
    throw new Error("Failed to search playlists. Please check your API key and internet connection.");
  }
}

export async function searchAlbums(query: string): Promise<Album[]> {
  try {
    // Search for playlists with "album" in context
    const searchData = await fetchFromYouTube("/search", {
      part: "snippet",
      q: `${query} album`,
      type: "playlist",
      maxResults: 25,
    });

    if (!searchData.items || searchData.items.length === 0) return [];

    const playlistIds = (searchData.items as YouTubeSearchItem[])
      .map((item) => item.id?.playlistId)
      .filter((id): id is string => !!id)
      .join(",");

    const playlistsData = await fetchFromYouTube("/playlists", {
      part: "snippet,contentDetails",
      id: playlistIds,
    });

    if (!playlistsData.items) return [];

    // Fetch first video from each playlist to get popularity metrics
    const albumsWithPopularity = await Promise.all(
      (playlistsData.items as YouTubePlaylist[]).map(async (playlist) => {
        let popularity = 0;

        try {
          // Get first video from playlist
          const playlistItemsData = await fetchFromYouTube("/playlistItems", {
            part: "snippet",
            playlistId: playlist.id,
            maxResults: 1,
          });

          if (playlistItemsData.items && playlistItemsData.items.length > 0) {
            const videoId = (playlistItemsData.items[0] as YouTubePlaylistItem).snippet?.resourceId?.videoId;

            if (videoId) {
              // Get video statistics
              const videoData = await fetchFromYouTube("/videos", {
                part: "statistics",
                id: videoId,
              });

              if (videoData.items && videoData.items.length > 0) {
                popularity = parseInt((videoData.items[0] as YouTubeVideo).statistics?.viewCount || "0");
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching popularity for playlist ${playlist.id}:`, error);
          // Continue with popularity = 0
        }

        return {
          id: playlist.id || "",
          title: playlist.snippet?.title || "Unknown Album",
          artist: playlist.snippet?.channelTitle || "Unknown Artist",
          thumbnail: playlist.snippet?.thumbnails?.medium?.url || "",
          url: `https://music.youtube.com/playlist?list=${playlist.id}`,
          itemCount: playlist.contentDetails?.itemCount || 0,
          popularity,
        };
      }),
    );

    // Sort by popularity (most viewed first)
    return albumsWithPopularity.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  } catch (error) {
    console.error("Error searching albums:", error);
    if (error instanceof Error && error.message.includes("API key")) {
      throw error;
    }
    throw new Error("Failed to search albums. Please check your API key and internet connection.");
  }
}

export async function getPlaylistTracks(playlistId: string): Promise<Song[]> {
  try {
    const playlistItemsData = await fetchFromYouTube("/playlistItems", {
      part: "snippet",
      playlistId: playlistId,
      maxResults: 50,
    });

    if (!playlistItemsData.items || playlistItemsData.items.length === 0) return [];

    const videoIds = (playlistItemsData.items as YouTubePlaylistItem[])
      .map((item) => item.snippet?.resourceId?.videoId)
      .filter((id): id is string => !!id)
      .join(",");

    if (!videoIds) return [];

    const videosData = await fetchFromYouTube("/videos", {
      part: "snippet,contentDetails",
      id: videoIds,
    });

    if (!videosData.items) return [];

    return (videosData.items as YouTubeVideo[]).map((video) => ({
      id: video.id || "",
      title: video.snippet?.title || "Unknown Title",
      artist: video.snippet?.channelTitle || "Unknown Artist",
      thumbnail: video.snippet?.thumbnails?.medium?.url || "",
      duration: formatDuration(video.contentDetails?.duration || ""),
      url: `https://music.youtube.com/watch?v=${video.id}`,
    }));
  } catch (error) {
    console.error("Error fetching playlist tracks:", error);
    if (error instanceof Error && error.message.includes("API key")) {
      throw error;
    }
    throw new Error("Failed to fetch playlist tracks. Please check your API key and internet connection.");
  }
}
