import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocalStorage, getSelectedText, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useDebounce } from "./utils";
import { Bookmark, BookmarkSourceUpdate, Movie, SortBy, Genre } from "./types";
import { getMovieDetails, searchMovies } from "./api";
import { SORT_OPTIONS, SEARCH_DEBOUNCE_MS, getAPIQuality, getAPIRating, BOOKMARK_STORAGE_KEY } from "./constants";

interface UseMovieSearchProps {
  initialQuery?: string;
  shouldUseSelectedText?: boolean;
}

interface Preferences {
  defaultQuality: string;
  defaultRating: string;
  defaultSort: SortBy;
  gridColumns: string;
  itemsPerPage: string;
}

export function useMovieSearch({ initialQuery, shouldUseSelectedText = false }: UseMovieSearchProps = {}) {
  const preferences = getPreferenceValues<Preferences>();
  const paginationLimit = parseInt(preferences.itemsPerPage) || 20;

  const [searchText, setSearchText] = useState(initialQuery || "");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>(preferences.defaultSort || "date_added");
  const [selectedGenre, setSelectedGenre] = useState<Genre>("All");
  const [selectedQuality, setSelectedQuality] = useState<string>(preferences.defaultQuality || "All");
  const [selectedRating, setSelectedRating] = useState<string>(preferences.defaultRating || "All");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const hasInitialized = useRef(false);

  const debouncedSearchText = useDebounce(searchText, SEARCH_DEBOUNCE_MS);

  // Only use selected text on first mount if explicitly requested and no initial query
  useEffect(() => {
    // Prevent running multiple times
    if (hasInitialized.current) return;

    if (!initialQuery && shouldUseSelectedText) {
      async function initializeWithSelectedText() {
        try {
          // Small delay to ensure we get fresh selected text
          await new Promise((resolve) => setTimeout(resolve, 100));
          const selectedText = await getSelectedText();
          if (selectedText && selectedText.trim()) {
            setSearchText(selectedText.trim());
            showToast({
              style: Toast.Style.Success,
              title: "Using Selected Text",
              message: `Searching for: "${selectedText.trim()}"`,
            });
          }
          // If no selected text, just continue with empty search - no error needed
        } catch {
          // Silently continue if selected text unavailable - this is normal
        }
      }

      initializeWithSelectedText();
    }

    hasInitialized.current = true;
  }, [initialQuery, shouldUseSelectedText, setSearchText]);

  // Auto-switch sorting based on search context
  useEffect(() => {
    if (debouncedSearchText.trim() === "") {
      setSortBy(preferences.defaultSort || "date_added");
    } else {
      setSortBy("download_count");
    }
  }, [debouncedSearchText, preferences.defaultSort]);

  // Reset pagination when search parameters change
  useEffect(() => {
    setCurrentPage(1);
    setHasMorePages(true);
    setMovies([]);
  }, [debouncedSearchText, sortBy, selectedGenre, selectedQuality, selectedRating]);

  // Fetch movies
  useEffect(() => {
    const abortController = new AbortController();

    async function fetchMovies() {
      setIsLoading(true);
      try {
        const response = await searchMovies(
          {
            query: debouncedSearchText,
            sortBy: sortBy,
            genre: selectedGenre,
            quality: getAPIQuality(selectedQuality),
            minimum_rating: getAPIRating(selectedRating),
            page: currentPage,
            limit: paginationLimit,
          },
          { signal: abortController.signal },
        );

        const newMovies = response.data.movies || [];

        if (currentPage === 1) {
          setMovies(newMovies);

          // Show friendly message when no results found
          if (newMovies.length === 0 && debouncedSearchText.trim()) {
            const hasFiltersApplied = selectedGenre !== "All" || selectedQuality !== "All" || selectedRating !== "All";

            showToast({
              style: Toast.Style.Failure,
              title: "No Movies Found",
              message: hasFiltersApplied
                ? "Try adjusting your filters or search terms"
                : `No results for "${debouncedSearchText.trim()}"`,
            });
          }
        } else {
          // Deduplicate by movie ID when adding to existing movies
          setMovies((prev) => {
            const existingIds = new Set(prev.map((movie) => movie.id));
            const uniqueNewMovies = newMovies.filter((movie) => !existingIds.has(movie.id));
            return [...prev, ...uniqueNewMovies];
          });
        }

        // Check if there are more pages
        setHasMorePages(newMovies.length === paginationLimit);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === "AbortError" ||
            error.message === "The operation was aborted." ||
            error.message === "The operation was aborted")
        ) {
          // Ignore aborted requests (happens during quick state changes)
          return;
        }
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to search movies",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        if (currentPage === 1) {
          setMovies([]);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }

    fetchMovies();

    return () => {
      abortController.abort();
    };
  }, [debouncedSearchText, sortBy, selectedGenre, selectedQuality, selectedRating, currentPage]);

  // Load more function for pagination
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMorePages && !isLoading) {
      setIsLoadingMore(true);
      setCurrentPage((prev) => prev + 1);
    }
  }, [isLoadingMore, hasMorePages, isLoading]);

  const cycleSortOptions = useCallback(() => {
    const currentIndex = SORT_OPTIONS.indexOf(sortBy);
    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
    setSortBy(SORT_OPTIONS[nextIndex]);
  }, [sortBy]);

  return {
    searchText,
    setSearchText,
    movies,
    isLoading,
    sortBy,
    setSortBy,
    selectedGenre,
    setSelectedGenre,
    selectedQuality,
    setSelectedQuality,
    selectedRating,
    setSelectedRating,
    cycleSortOptions,
    debouncedSearchText,
    loadMore,
    hasMorePages,
    isLoadingMore,
  };
}

type BookmarkMap = Record<number, Bookmark>;

interface StoredBookmarksPayload {
  version?: number;
  bookmarks?: Bookmark[];
}

type BookmarkListener = (bookmarks: BookmarkMap) => void;

const BOOKMARK_STORAGE_VERSION = 2;
const bookmarkListeners = new Set<BookmarkListener>();
let cachedBookmarks: BookmarkMap | null = null;
let bookmarksLoadPromise: Promise<BookmarkMap> | null = null;
let hasShownBookmarkLoadError = false;
let persistQueue: Promise<void> = Promise.resolve();

function emitBookmarkUpdate(bookmarks: BookmarkMap) {
  if (bookmarkListeners.size === 0) {
    return;
  }

  for (const listener of bookmarkListeners) {
    try {
      listener(bookmarks);
    } catch (error) {
      console.error("Bookmark listener failed", error);
    }
  }
}

function subscribeToBookmarkUpdates(listener: BookmarkListener) {
  bookmarkListeners.add(listener);
  return () => {
    bookmarkListeners.delete(listener);
  };
}

function getNowIso(): string {
  return new Date().toISOString();
}

function normalizeBookmarkList(list: Bookmark[] | undefined | null): BookmarkMap {
  if (!Array.isArray(list)) {
    return {};
  }

  const normalized: BookmarkMap = {};
  const fallbackTimestamp = getNowIso();

  for (const item of list) {
    if (!item || typeof item.id !== "number") {
      continue;
    }

    const createdAt = item.createdAt || fallbackTimestamp;
    const updatedAt = item.updatedAt || createdAt;
    const lastSyncedAt = item.lastSyncedAt || updatedAt;
    const sourceUpdate: BookmarkSourceUpdate =
      item.sourceUpdate &&
      typeof item.sourceUpdate.at === "string" &&
      (item.sourceUpdate.type === "initial" || item.sourceUpdate.type === "manual" || item.sourceUpdate.type === "sync")
        ? item.sourceUpdate
        : { type: "initial", at: createdAt };

    const qualities = Array.isArray(item.qualities)
      ? Array.from(
          new Set(
            item.qualities
              .filter((quality): quality is string => typeof quality === "string")
              .map((quality) => quality.trim())
              .filter((quality) => quality.length > 0),
          ),
        )
      : [];

    const lastKnownQualities = Array.isArray(item.lastKnownQualities)
      ? Array.from(
          new Set(
            item.lastKnownQualities
              .filter((quality): quality is string => typeof quality === "string")
              .map((quality) => quality.trim())
              .filter((quality) => quality.length > 0),
          ),
        )
      : qualities;

    normalized[item.id] = {
      ...item,
      slug: item.slug || `movie-${item.id}`,
      title: item.title || "Untitled Movie",
      qualities,
      createdAt,
      updatedAt,
      lastSyncedAt,
      sourceUpdate,
      hasNewQuality: Boolean(item.hasNewQuality),
      lastKnownQualities,
    };
  }

  return normalized;
}

async function readBookmarksFromStorage(): Promise<BookmarkMap> {
  const raw = await LocalStorage.getItem<string>(BOOKMARK_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as StoredBookmarksPayload | Bookmark[];

    if (Array.isArray(parsed)) {
      return normalizeBookmarkList(parsed);
    }

    if (parsed && typeof parsed === "object" && Array.isArray(parsed.bookmarks)) {
      return normalizeBookmarkList(parsed.bookmarks);
    }
  } catch {
    if (!hasShownBookmarkLoadError) {
      hasShownBookmarkLoadError = true;
      await showToast({
        style: Toast.Style.Failure,
        title: "Bookmarks Reset",
        message: "Stored bookmarks were corrupted and have been cleared.",
      });
    }
  }

  return {};
}

async function ensureBookmarksLoaded(): Promise<BookmarkMap> {
  if (cachedBookmarks) {
    return cachedBookmarks;
  }

  if (bookmarksLoadPromise) {
    return bookmarksLoadPromise;
  }

  bookmarksLoadPromise = (async () => {
    const loaded = await readBookmarksFromStorage();
    cachedBookmarks = loaded;
    return loaded;
  })();

  try {
    return await bookmarksLoadPromise;
  } finally {
    bookmarksLoadPromise = null;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

function extractQualities(movie: Movie): string[] {
  const qualities =
    movie.torrents
      ?.map((torrent) => (typeof torrent.quality === "string" ? torrent.quality.trim() : ""))
      .filter((quality) => quality.length > 0) ?? [];

  return Array.from(new Set(qualities));
}

function createBookmarkFromMovie(movie: Movie, existing?: Bookmark): Bookmark {
  const now = getNowIso();

  const qualities = extractQualities(movie);
  const title = movie.title_long || movie.title || movie.title_english || existing?.title || "Untitled Movie";
  const coverImage =
    movie.medium_cover_image || movie.large_cover_image || movie.small_cover_image || existing?.coverImage || undefined;

  return {
    id: movie.id,
    slug: movie.slug || existing?.slug || `movie-${movie.id}`,
    title,
    year: movie.year && movie.year > 0 ? movie.year : existing?.year,
    coverImage,
    rating: movie.rating && movie.rating > 0 ? movie.rating : existing?.rating,
    runtime: movie.runtime && movie.runtime > 0 ? movie.runtime : existing?.runtime,
    imdbCode: movie.imdb_code || existing?.imdbCode,
    qualities: qualities.length > 0 ? qualities : (existing?.qualities ?? []),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSyncedAt: existing?.lastSyncedAt ?? now,
    sourceUpdate: existing?.sourceUpdate ?? { type: "initial", at: now },
    hasNewQuality: existing?.hasNewQuality ?? false,
    lastKnownQualities: qualities.length > 0 ? qualities : (existing?.lastKnownQualities ?? []),
  };
}

async function persistBookmarks(next: BookmarkMap, previous: BookmarkMap) {
  if (next === previous) {
    return;
  }

  const payload = JSON.stringify({
    version: BOOKMARK_STORAGE_VERSION,
    bookmarks: Object.values(next),
  });

  const task = persistQueue.then(async () => {
    const previousSnapshot = cachedBookmarks;
    cachedBookmarks = next;
    emitBookmarkUpdate(next);

    try {
      await LocalStorage.setItem(BOOKMARK_STORAGE_KEY, payload);
    } catch (error) {
      cachedBookmarks = previousSnapshot ?? previous;
      emitBookmarkUpdate(cachedBookmarks);
      throw error;
    }
  });

  persistQueue = task.catch(() => {
    // keep the queue alive even if a write fails
  });

  await task;
}

function sortBookmarks(map: BookmarkMap): Bookmark[] {
  return Object.values(map).sort((a, b) => {
    return b.createdAt.localeCompare(a.createdAt);
  });
}

interface UseBookmarksState {
  map: BookmarkMap;
  isLoading: boolean;
}

interface UseBookmarksResult {
  bookmarks: Bookmark[];
  bookmarkMap: BookmarkMap;
  bookmarkCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isBookmarked: (movieId: number) => boolean;
  addBookmark: (movie: Movie) => Promise<Bookmark>;
  removeBookmark: (movieId: number) => Promise<boolean>;
  toggleBookmark: (movie: Movie) => Promise<boolean>;
  refreshBookmarks: () => Promise<void>;
  acknowledgeQualityUpdate: (movieId: number) => Promise<boolean>;
}

export function useBookmarks(): UseBookmarksResult {
  const [state, setState] = useState<UseBookmarksState>({
    map: cachedBookmarks ?? {},
    isLoading: !cachedBookmarks,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const handleUpdate: BookmarkListener = (bookmarks) => {
      if (!isMounted) {
        return;
      }

      setState((prev) => {
        if (prev.map === bookmarks) {
          return prev;
        }

        return { ...prev, map: bookmarks };
      });
    };

    const unsubscribe = subscribeToBookmarkUpdates(handleUpdate);

    (async () => {
      const bookmarks = await ensureBookmarksLoaded();
      if (!isMounted) {
        return;
      }

      setState({ map: bookmarks, isLoading: false });
    })();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const bookmarks = useMemo(() => sortBookmarks(state.map), [state.map]);
  const bookmarkCount = bookmarks.length;

  const isBookmarked = useCallback((movieId: number) => Boolean(state.map[movieId]), [state.map]);

  const addBookmark = useCallback(async (movie: Movie) => {
    const current = await ensureBookmarksLoaded();
    const existing = current[movie.id];

    const nextBookmark = createBookmarkFromMovie(movie, existing);
    const next = {
      ...current,
      [movie.id]: nextBookmark,
    };

    try {
      await persistBookmarks(next, current);
      return nextBookmark;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to save bookmark",
        message: getErrorMessage(error),
      });
      throw error;
    }
  }, []);

  const removeBookmark = useCallback(async (movieId: number) => {
    const current = await ensureBookmarksLoaded();

    if (!current[movieId]) {
      return false;
    }

    const next = { ...current };
    delete next[movieId];

    try {
      await persistBookmarks(next, current);
      return true;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to remove bookmark",
        message: getErrorMessage(error),
      });
      throw error;
    }
  }, []);

  const toggleBookmark = useCallback(
    async (movie: Movie) => {
      const current = await ensureBookmarksLoaded();

      if (current[movie.id]) {
        await removeBookmark(movie.id);
        return false;
      }

      await addBookmark(movie);
      return true;
    },
    [addBookmark, removeBookmark],
  );

  const refreshBookmarks = useCallback(async () => {
    if (isRefreshing) {
      return;
    }

    const current = await ensureBookmarksLoaded();
    const bookmarkValues = Object.values(current);

    if (bookmarkValues.length === 0) {
      await showToast({
        style: Toast.Style.Animated,
        title: "No Bookmarks to Refresh",
      });
      return;
    }

    setIsRefreshing(true);
    const now = getNowIso();
    const next: BookmarkMap = {};
    const updates: Array<{ bookmark: Bookmark; updated: Bookmark; hasQualityUpdate: boolean }> = [];
    const failures: Array<{ bookmark: Bookmark; error: string }> = [];

    const batchSize = 5;
    for (let i = 0; i < bookmarkValues.length; i += batchSize) {
      const batch = bookmarkValues.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (bookmark) => {
          try {
            const response = await getMovieDetails(bookmark.id);
            const movie = response.data.movie;
            const updatedBookmark = createBookmarkFromMovie(movie, bookmark);

            const originalQualities = new Set(bookmark.lastKnownQualities ?? bookmark.qualities);
            const newQualities = new Set(updatedBookmark.qualities);
            const hasQualityUpdate = [...newQualities].some((quality) => !originalQualities.has(quality));

            next[bookmark.id] = {
              ...updatedBookmark,
              hasNewQuality: hasQualityUpdate,
              lastKnownQualities: updatedBookmark.qualities,
              lastSyncedAt: now,
              sourceUpdate: { type: "sync", at: now },
            };

            updates.push({ bookmark, updated: next[bookmark.id], hasQualityUpdate });
          } catch (error) {
            failures.push({ bookmark, error: getErrorMessage(error) });
            next[bookmark.id] = {
              ...bookmark,
              lastSyncedAt: now,
              sourceUpdate: { type: "sync", at: now, note: "Failed to refresh" },
            };
          }
        }),
      );
    }

    let toastStyle = Toast.Style.Success;
    let toastTitle = "Bookmarks Refreshed";
    let toastMessage: string | undefined;

    const updatedWithNewQualities = updates.filter((entry) => entry.hasQualityUpdate);

    if (failures.length === bookmarkValues.length) {
      toastStyle = Toast.Style.Failure;
      toastTitle = "Failed to refresh bookmarks";
      toastMessage = "Unable to fetch updates from YTS.";
    } else if (failures.length > 0) {
      toastStyle = Toast.Style.Animated;
      toastTitle = "Bookmarks partially refreshed";
      toastMessage = `${updates.length - failures.length} updated, ${failures.length} failed`;
    } else if (updatedWithNewQualities.length > 0) {
      toastMessage = `${updatedWithNewQualities.length} bookmark${
        updatedWithNewQualities.length === 1 ? "" : "s"
      } have new qualities`;
    } else {
      toastMessage = "No new qualities found";
    }

    try {
      await persistBookmarks(next, current);
      await showToast({
        style: toastStyle,
        title: toastTitle,
        message: toastMessage,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh bookmarks",
        message: getErrorMessage(error),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  const acknowledgeQualityUpdate = useCallback(async (movieId: number) => {
    const current = await ensureBookmarksLoaded();
    const bookmark = current[movieId];

    if (!bookmark || !bookmark.hasNewQuality) {
      return false;
    }

    const next = {
      ...current,
      [movieId]: {
        ...bookmark,
        hasNewQuality: false,
        sourceUpdate:
          bookmark.sourceUpdate?.type === "sync"
            ? { ...bookmark.sourceUpdate, note: "Quality update acknowledged" }
            : bookmark.sourceUpdate,
      },
    } satisfies BookmarkMap;

    try {
      await persistBookmarks(next, current);
      return true;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update bookmark",
        message: getErrorMessage(error),
      });
      throw error;
    }
  }, []);

  return {
    bookmarks,
    bookmarkMap: state.map,
    bookmarkCount,
    isLoading: state.isLoading,
    isRefreshing,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    refreshBookmarks,
    acknowledgeQualityUpdate,
  };
}

export function __resetBookmarksCacheForTesting() {
  cachedBookmarks = null;
  bookmarksLoadPromise = null;
  bookmarkListeners.clear();
  hasShownBookmarkLoadError = false;
}
