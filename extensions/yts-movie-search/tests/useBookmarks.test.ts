import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, beforeEach, vi, it } from "vitest";
import { useBookmarks, __resetBookmarksCacheForTesting } from "../src/hooks";
import { BOOKMARK_STORAGE_KEY } from "../src/constants";
import { getMovieDetails } from "../src/api";
import type { Movie } from "../src/types";
import { LocalStorage, __storage as storage } from "@raycast/api";

vi.mock("../src/api", () => ({
  getMovieDetails: vi.fn(),
  searchMovies: vi.fn(),
}));

const getMovieDetailsMock = vi.mocked(getMovieDetails);

function createMovie(overrides: Partial<Movie> = {}): Movie {
  const baseMovie: Movie = {
    id: 42,
    url: "https://example.com/movie/42",
    imdb_code: "tt1234567",
    title: "Example Movie",
    title_english: "Example Movie",
    title_long: "Example Movie (2024)",
    slug: "example-movie",
    year: 2024,
    rating: 8.2,
    runtime: 120,
    genres: ["Action"],
    summary: "Summary",
    description_full: "Full description",
    synopsis: "Synopsis",
    yt_trailer_code: "abc123",
    language: "English",
    mpa_rating: "PG-13",
    background_image: "",
    background_image_original: "",
    small_cover_image: "https://example.com/poster-small.jpg",
    medium_cover_image: "https://example.com/poster-medium.jpg",
    large_cover_image: "https://example.com/poster-large.jpg",
    state: "ok",
    torrents: [
      {
        url: "https://example.com/torrent1",
        hash: "hash1",
        quality: "1080p",
        type: "bluray",
        seeds: 100,
        peers: 10,
        size: "2 GB",
        size_bytes: 2147483648,
        date_uploaded: "2024-01-01",
        date_uploaded_unix: 1704067200,
      },
      {
        url: "https://example.com/torrent2",
        hash: "hash2",
        quality: "720p",
        type: "bluray",
        seeds: 50,
        peers: 5,
        size: "1 GB",
        size_bytes: 1073741824,
        date_uploaded: "2024-01-02",
        date_uploaded_unix: 1704153600,
      },
    ],
    date_uploaded: "2024-01-01",
    date_uploaded_unix: 1704067200,
  };

  return { ...baseMovie, ...overrides };
}

describe("useBookmarks", () => {
  beforeEach(async () => {
    storage.clear();
    vi.clearAllMocks();
    __resetBookmarksCacheForTesting();
    await LocalStorage.clear();
    getMovieDetailsMock.mockReset();
    getMovieDetailsMock.mockResolvedValue({
      data: {
        movie: createMovie(),
      },
    });
  });

  it("loads existing bookmarks from storage", async () => {
    const storedBookmark = {
      id: 1,
      slug: "stored-movie",
      title: "Stored Movie",
      year: 2023,
      coverImage: "https://example.com/stored.jpg",
      qualities: ["1080p"],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    };

    await LocalStorage.setItem(
      BOOKMARK_STORAGE_KEY,
      JSON.stringify({ version: 1, bookmarks: [storedBookmark] }),
    );

    const { result } = renderHook(() => useBookmarks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.bookmarkCount).toBe(1);
    expect(result.current.bookmarks[0].id).toBe(1);
    expect(result.current.bookmarks[0].qualities).toEqual(["1080p"]);
    expect(result.current.bookmarks[0].lastSyncedAt).toBeDefined();
    expect(result.current.bookmarks[0].sourceUpdate?.type).toBe("initial");
    expect(result.current.isBookmarked(1)).toBe(true);
  });

  it("adds a bookmark and persists it", async () => {
    const movie = createMovie({ id: 100 });
    const { result } = renderHook(() => useBookmarks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addBookmark(movie);
    });

    expect(result.current.bookmarks[0].lastSyncedAt).toBeDefined();
    expect(result.current.bookmarks[0].sourceUpdate?.type).toBe("initial");
    expect(result.current.isBookmarked(100)).toBe(true);
    expect(result.current.bookmarkCount).toBe(1);
    expect(result.current.bookmarks[0].qualities).toEqual(["1080p", "720p"]);

    const stored = storage.get(BOOKMARK_STORAGE_KEY);
    expect(stored).toBeDefined();
    const parsed = stored ? JSON.parse(stored) : null;
    expect(parsed?.bookmarks?.[0]?.id).toBe(100);
  });

  it("toggles a bookmark off when already saved", async () => {
    const movie = createMovie({ id: 200 });
    const { result } = renderHook(() => useBookmarks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addBookmark(movie);
    });

    expect(result.current.isBookmarked(200)).toBe(true);

    await act(async () => {
      const active = await result.current.toggleBookmark(movie);
      expect(active).toBe(false);
    });

    expect(result.current.isBookmarked(200)).toBe(false);
    expect(result.current.bookmarkCount).toBe(0);

    const stored = storage.get(BOOKMARK_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    expect(parsed?.bookmarks ?? []).toHaveLength(0);
  });

  it("refreshes bookmarks and updates sync metadata", async () => {
    const movie = createMovie({ id: 300 });
    const { result } = renderHook(() => useBookmarks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2024-02-01T00:00:00.000Z"));
      await act(async () => {
        await result.current.addBookmark(movie);
      });

      const beforeRefresh = result.current.bookmarks[0];
      expect(beforeRefresh.lastSyncedAt).toBeDefined();

      getMovieDetailsMock.mockResolvedValue({
        data: {
          movie: createMovie({
            id: 300,
            torrents: [
              {
                url: "https://example.com/torrent1",
                hash: "hash1",
                quality: "1080p",
                type: "bluray",
                seeds: 100,
                peers: 10,
                size: "2 GB",
                size_bytes: 2147483648,
                date_uploaded: "2024-02-01",
                date_uploaded_unix: 1706745600,
              },
              {
                url: "https://example.com/torrent2",
                hash: "hash2",
                quality: "720p",
                type: "bluray",
                seeds: 50,
                peers: 5,
                size: "1 GB",
                size_bytes: 1073741824,
                date_uploaded: "2024-02-02",
                date_uploaded_unix: 1706832000,
              },
              {
                url: "https://example.com/torrent3",
                hash: "hash3",
                quality: "2160p",
                type: "bluray",
                seeds: 20,
                peers: 2,
                size: "4 GB",
                size_bytes: 4294967296,
                date_uploaded: "2024-02-03",
                date_uploaded_unix: 1706918400,
              },
            ],
          }),
        },
      });

      vi.setSystemTime(new Date("2024-02-05T00:00:00.000Z"));
      await act(async () => {
        await result.current.refreshBookmarks();
      });

      const afterRefresh = result.current.bookmarks[0];
      expect(afterRefresh.lastSyncedAt).not.toBe(beforeRefresh.lastSyncedAt);
      expect(afterRefresh.sourceUpdate?.type).toBe("sync");
      expect(afterRefresh.hasNewQuality).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("acknowledges quality updates", async () => {
    const movie = createMovie({ id: 301 });
    const { result } = renderHook(() => useBookmarks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2024-02-01T00:00:00.000Z"));
      await act(async () => {
        await result.current.addBookmark(movie);
      });

      getMovieDetailsMock.mockResolvedValue({
        data: {
          movie: createMovie({
            id: 301,
            torrents: [
              {
                url: "https://example.com/torrent1",
                hash: "hash1",
                quality: "1080p",
                type: "bluray",
                seeds: 100,
                peers: 10,
                size: "2 GB",
                size_bytes: 2147483648,
                date_uploaded: "2024-02-01",
                date_uploaded_unix: 1706745600,
              },
              {
                url: "https://example.com/torrent2",
                hash: "hash2",
                quality: "2160p",
                type: "bluray",
                seeds: 20,
                peers: 2,
                size: "4 GB",
                size_bytes: 4294967296,
                date_uploaded: "2024-02-03",
                date_uploaded_unix: 1706918400,
              },
            ],
          }),
        },
      });

      await act(async () => {
        await result.current.refreshBookmarks();
      });

      expect(result.current.bookmarks[0].hasNewQuality).toBe(true);

      await act(async () => {
        await result.current.acknowledgeQualityUpdate(301);
      });

      expect(result.current.bookmarks[0].hasNewQuality).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
