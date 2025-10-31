import React, { useEffect, useMemo, useRef, useState } from "react";
import { Grid, ActionPanel, Action, Icon, useNavigation, LaunchProps, getPreferenceValues } from "@raycast/api";
import { Genre, GENRES, SortBy, Movie, Bookmark } from "./types";
import { useBookmarks, useMovieSearch } from "./hooks";
import {
  SORT_DISPLAY_NAMES,
  QUALITY_OPTIONS,
  QUALITY_DISPLAY_NAMES,
  RATING_OPTIONS,
  RATING_DISPLAY_NAMES,
} from "./constants";
import { ErrorBoundary } from "./error-boundary";
import { MovieItem } from "./components/movie-item";
import { initializeTrackers, refreshTrackersIfNeeded } from "./trackers";

interface Arguments {
  query?: string;
}

interface Preferences {
  defaultQuality: string;
  defaultRating: string;
  defaultSort: SortBy;
  gridColumns: string;
  itemsPerPage: string;
}

type ViewMode = "movies" | "bookmarks";

export default function SearchMovies({ arguments: args }: LaunchProps<{ arguments: Arguments }>) {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const gridColumns = parseInt(preferences.gridColumns) || 5;
  const pageSize = parseInt(preferences.itemsPerPage) || 20;
  const [viewMode, setViewMode] = useState<ViewMode>("movies");
  const [bookmarkPage, setBookmarkPage] = useState(1);
  const { bookmarks, bookmarkMap, isLoading: isLoadingBookmarks, refreshBookmarks, isRefreshing } = useBookmarks();
  const autoRefreshSignatureRef = useRef<string | null>(null);

  const {
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
  } = useMovieSearch({
    initialQuery: args.query,
    shouldUseSelectedText: !args.query,
  });

  const hasFiltersApplied = selectedGenre !== "All" || selectedQuality !== "All" || selectedRating !== "All";
  const normalizedSearch = useMemo(() => debouncedSearchText.trim().toLowerCase(), [debouncedSearchText]);

  const bookmarkMovies = useMemo(() => {
    return bookmarks
      .filter((bookmark) => {
        if (!normalizedSearch) return true;
        const haystack = `${bookmark.title} ${bookmark.slug}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .map((bookmark) => bookmarkToMovie(bookmark));
  }, [bookmarks, normalizedSearch]);

  const paginatedBookmarks = useMemo(() => {
    const endIndex = bookmarkPage * pageSize;
    return bookmarkMovies.slice(0, endIndex);
  }, [bookmarkMovies, bookmarkPage, pageSize]);

  const bookmarkHasMore = bookmarkMovies.length > paginatedBookmarks.length;

  // Initialize and refresh tracker list on mount (runs once)
  useEffect(() => {
    async function setupTrackers() {
      await initializeTrackers();
      // Refresh in background if needed (non-blocking)
      refreshTrackersIfNeeded();
    }
    setupTrackers();
  }, []);

  useEffect(() => {
    if (viewMode !== "bookmarks" || isRefreshing) {
      return;
    }

    if (bookmarks.length === 0) {
      return;
    }

    const now = Date.now();
    const AUTO_REFRESH_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours
    const bucket = Math.floor(now / AUTO_REFRESH_THRESHOLD_MS);
    const signature = `${bucket}|${bookmarks.map((bookmark) => `${bookmark.id}:${bookmark.lastSyncedAt ?? ""}`).join("|")}`;

    if (autoRefreshSignatureRef.current === signature) {
      return;
    }

    const needsRefresh = bookmarks.some((bookmark) => {
      if (!bookmark.lastSyncedAt) {
        return true;
      }

      const syncedAt = Date.parse(bookmark.lastSyncedAt);
      if (Number.isNaN(syncedAt)) {
        return true;
      }

      return now - syncedAt > AUTO_REFRESH_THRESHOLD_MS;
    });

    autoRefreshSignatureRef.current = signature;

    if (needsRefresh) {
      refreshBookmarks();
    }
  }, [viewMode, bookmarks, isRefreshing, refreshBookmarks]);

  useEffect(() => {
    if (viewMode === "bookmarks") {
      setBookmarkPage(1);
    }
  }, [viewMode, normalizedSearch, bookmarks.length]);

  const displayedMovies = viewMode === "bookmarks" ? paginatedBookmarks : movies;
  const isGridLoading = viewMode === "bookmarks" ? isLoadingBookmarks : isLoading;

  const navigationTitle = useMemo(() => {
    if (viewMode === "bookmarks") {
      return "YTS • Bookmarked";
    }

    const parts = [] as string[];

    if (selectedGenre !== "All") {
      parts.push(selectedGenre);
    }

    if (selectedQuality !== "All") {
      parts.push(QUALITY_DISPLAY_NAMES[selectedQuality]);
    }

    if (selectedRating !== "All") {
      parts.push(RATING_DISPLAY_NAMES[selectedRating]);
    }

    parts.push(SORT_DISPLAY_NAMES[sortBy]);

    if (parts.length > 0) {
      return `YTS • ${parts.join(" • ")}`;
    }

    return "YTS Movies";
  }, [sortBy, selectedGenre, selectedQuality, selectedRating, viewMode]);

  const dropdownValue = useMemo(() => {
    if (viewMode === "bookmarks") {
      return "view-bookmarks";
    }

    if (selectedGenre !== "All") {
      return `genre-${selectedGenre}`;
    }

    if (selectedQuality !== "All") {
      return `quality-${selectedQuality}`;
    }

    if (selectedRating !== "All") {
      return `rating-${selectedRating}`;
    }

    return sortBy;
  }, [viewMode, selectedGenre, selectedQuality, selectedRating, sortBy]);

  const searchPlaceholder = viewMode === "bookmarks" ? "Search your bookmarked movies..." : "Search movie titles...";

  return (
    <ErrorBoundary>
      <Grid
        columns={gridColumns}
        aspectRatio="2/3"
        fit={Grid.Fit.Fill}
        isLoading={isGridLoading}
        navigationTitle={navigationTitle}
        searchText={searchText}
        onSearchTextChange={(value) => {
          if (viewMode === "bookmarks") {
            setBookmarkPage(1);
          }
          setSearchText(value);
        }}
        searchBarPlaceholder={searchPlaceholder}
        pagination={
          viewMode === "bookmarks"
            ? {
                pageSize,
                hasMore: bookmarkHasMore,
                onLoadMore: () => {
                  if (bookmarkHasMore) {
                    setBookmarkPage((prev) => prev + 1);
                  }
                },
              }
            : {
                pageSize,
                hasMore: hasMorePages,
                onLoadMore: loadMore,
              }
        }
        searchBarAccessory={
          <Grid.Dropdown
            tooltip="Sort and Filter (Cmd+S to cycle sort)"
            storeValue={true}
            value={dropdownValue}
            onChange={(newValue: string) => {
              if (newValue === "view-bookmarks") {
                setViewMode("bookmarks");
                setSelectedGenre("All");
                setSelectedQuality("All");
                setSelectedRating("All");
                return;
              }

              if (viewMode === "bookmarks") {
                setViewMode("movies");
              }

              if (newValue.startsWith("genre-")) {
                const genre = newValue.replace("genre-", "");
                setSelectedGenre(genre as Genre);
              } else if (newValue.startsWith("quality-")) {
                const quality = newValue.replace("quality-", "");
                setSelectedQuality(quality);
              } else if (newValue.startsWith("rating-")) {
                const rating = newValue.replace("rating-", "");
                setSelectedRating(rating);
              } else {
                setSortBy(newValue as SortBy);
              }
            }}
          >
            <Grid.Dropdown.Section title="Views">
              <Grid.Dropdown.Item title="Bookmarked Movies" value="view-bookmarks" icon={Icon.Bookmark} />
            </Grid.Dropdown.Section>

            <Grid.Dropdown.Section title="Sort Options">
              <Grid.Dropdown.Item title="Popular" value="download_count" icon={Icon.Download} />
              <Grid.Dropdown.Item title="Rating" value="rating" icon={Icon.Star} />
              <Grid.Dropdown.Item title="Year" value="year" icon={Icon.Calendar} />
              <Grid.Dropdown.Item title="Title" value="title" icon={Icon.Text} />
              <Grid.Dropdown.Item title="Like Count" value="like_count" icon={Icon.Heart} />
              <Grid.Dropdown.Item title="Latest" value="date_added" icon={Icon.Clock} />
            </Grid.Dropdown.Section>

            <Grid.Dropdown.Section title="Filter by Genre">
              {GENRES.map((genre) => (
                <Grid.Dropdown.Item
                  key={genre}
                  title={genre}
                  value={`genre-${genre}`}
                  icon={genre === "All" ? Icon.AppWindow : Icon.Tag}
                />
              ))}
            </Grid.Dropdown.Section>

            <Grid.Dropdown.Section title="Filter by Quality">
              {QUALITY_OPTIONS.map((quality) => (
                <Grid.Dropdown.Item
                  key={quality}
                  title={QUALITY_DISPLAY_NAMES[quality]}
                  value={`quality-${quality}`}
                  icon={quality === "All" ? Icon.Monitor : Icon.Video}
                />
              ))}
            </Grid.Dropdown.Section>

            <Grid.Dropdown.Section title="Filter by Rating">
              {RATING_OPTIONS.map((rating) => (
                <Grid.Dropdown.Item
                  key={rating}
                  title={RATING_DISPLAY_NAMES[rating]}
                  value={`rating-${rating}`}
                  icon={rating === "All" ? Icon.StarCircle : Icon.Star}
                />
              ))}
            </Grid.Dropdown.Section>
          </Grid.Dropdown>
        }
        throttle
      >
        {displayedMovies.length === 0 && !isGridLoading && !isLoadingMore && (
          <Grid.EmptyView
            icon={normalizedSearch ? Icon.MagnifyingGlass : viewMode === "bookmarks" ? Icon.Bookmark : Icon.Video}
            title={
              viewMode === "bookmarks"
                ? normalizedSearch
                  ? "No Matching Bookmarks"
                  : "No Bookmarked Movies"
                : normalizedSearch
                  ? "No Movies Found"
                  : hasFiltersApplied
                    ? "No Movies Found"
                    : "Search for Movies"
            }
            description={
              viewMode === "bookmarks"
                ? normalizedSearch
                  ? `No bookmarked movies match "${debouncedSearchText.trim()}" right now.`
                  : "Bookmark movies from the grid or detail view to monitor them for higher-quality releases."
                : normalizedSearch
                  ? `No results found for "${debouncedSearchText.trim()}"${
                      hasFiltersApplied ? " with current filters" : ""
                    }. Try different keywords or adjust filters.`
                  : hasFiltersApplied
                    ? "No movies available with current filters. Try different filter options or search for specific titles."
                    : "Type a movie title above to search the YTS database, or browse by genre, quality, and sort options."
            }
            actions={
              viewMode === "bookmarks" ? (
                <ActionPanel>
                  <Action
                    title={isRefreshing ? "Refreshing Bookmarks…" : "Refresh Bookmarked Movies"}
                    icon={Icon.ArrowClockwise}
                    onAction={refreshBookmarks}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  />
                  <Action
                    title="Browse All Movies"
                    icon={Icon.AppWindow}
                    onAction={() => {
                      setViewMode("movies");
                    }}
                  />
                </ActionPanel>
              ) : normalizedSearch || hasFiltersApplied ? (
                <ActionPanel>
                  <Action
                    title="Clear Filters"
                    icon={Icon.Trash}
                    onAction={() => {
                      setSearchText("");
                      setSelectedGenre("All");
                      setSelectedQuality("All");
                      setSelectedRating("All");
                    }}
                  />
                </ActionPanel>
              ) : undefined
            }
          />
        )}

        {displayedMovies.map((movie) => (
          <MovieItem
            key={movie.id}
            movie={movie}
            push={push}
            cycleSortOptions={cycleSortOptions}
            showRefreshAction={viewMode === "bookmarks"}
            onRefreshBookmarks={refreshBookmarks}
            isRefreshing={isRefreshing}
            hasNewQuality={Boolean(bookmarkMap[movie.id]?.hasNewQuality)}
          />
        ))}

        {viewMode === "movies" && isLoadingMore && (
          <Grid.Item
            content={{ source: Icon.ArrowClockwise }}
            title="Loading more..."
            subtitle="Fetching additional results"
          />
        )}
      </Grid>
    </ErrorBoundary>
  );
}

function bookmarkToMovie(bookmark: Bookmark): Movie {
  const timestamp = Date.parse(bookmark.updatedAt || bookmark.createdAt);
  const dateUploadedUnix = Number.isNaN(timestamp) ? 0 : Math.floor(timestamp / 1000);

  return {
    id: bookmark.id,
    url: `https://yts.mx/movies/${bookmark.slug}`,
    imdb_code: bookmark.imdbCode || "",
    title: bookmark.title,
    title_english: bookmark.title,
    title_long: bookmark.year ? `${bookmark.title} (${bookmark.year})` : bookmark.title,
    slug: bookmark.slug,
    year: bookmark.year ?? 0,
    rating: bookmark.rating ?? 0,
    runtime: bookmark.runtime ?? 0,
    genres: [],
    summary: "",
    description_full: "",
    synopsis: "",
    yt_trailer_code: "",
    language: "",
    mpa_rating: "",
    background_image: "",
    background_image_original: "",
    small_cover_image: bookmark.coverImage || "",
    medium_cover_image: bookmark.coverImage || "",
    large_cover_image: bookmark.coverImage || "",
    state: "ok",
    torrents: bookmark.qualities.map((quality) => ({
      url: "",
      hash: `${bookmark.id}-${quality}`,
      quality,
      type: "",
      seeds: 0,
      peers: 0,
      size: "",
      size_bytes: 0,
      date_uploaded: bookmark.updatedAt,
      date_uploaded_unix: dateUploadedUnix,
    })),
    date_uploaded: bookmark.updatedAt,
    date_uploaded_unix: dateUploadedUnix,
  };
}
