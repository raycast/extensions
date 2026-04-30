import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, List, Icon, showToast, Toast } from "@raycast/api";
import { ErrorBoundary } from "react-error-boundary";
import { LazyForecastView } from "./components/lazy-forecast";
import { ListErrorFallback } from "./components/ErrorBoundaryFallback";
import WelcomeMessage from "./components/welcome-message";

import { getWeather, type TimeseriesEntry } from "./weather-client";
import { type SunTimes } from "./sunrise-client";
import { type LocationResult } from "./location-search";
import { type FavoriteLocation, isFirstTimeUser, markAsNotFirstTime } from "./storage";

import { iconForSymbol } from "./weather-emoji";
import { TemperatureFormatter } from "./utils/weather-formatters";

import { useSearch } from "./hooks/useSearch";
import { useFavorites } from "./hooks/useFavorites";
import { useGraphCache } from "./hooks/useGraphCache";
import { UI_THRESHOLDS } from "./config/weather-config";
import { clearAllCached } from "./cache";
import { DebugLogger } from "./utils/debug-utils";

import { ToastMessages } from "./utils/toast-utils";
import { LocationUtils } from "./utils/location-utils";
import { WeatherFormatters } from "./utils/weather-formatters";
import { ActionPanelBuilders } from "./utils/action-panel-builders";

export default function Command() {
  return (
    <ErrorBoundary FallbackComponent={ListErrorFallback}>
      <CommandContent />
    </ErrorBoundary>
  );
}

function CommandContent() {
  // UI state
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);

  // Custom hooks for different responsibilities
  const search = useSearch();
  const favorites = useFavorites();
  const graphCache = useGraphCache();

  // Derive favorite membership from loaded favorites to avoid duplicate storage reads.
  const favoriteKeySet = useMemo(
    () => new Set(favorites.favorites.map((f) => LocationUtils.getLocationKey(f.id, f.lat, f.lon))),
    [favorites.favorites],
  );
  const isLocationFavorite = (loc: LocationResult): boolean =>
    favoriteKeySet.has(LocationUtils.getLocationKey(loc.id, loc.lat, loc.lon));

  // Check if this is the first time opening the extension
  useEffect(() => {
    const checkFirstTime = async () => {
      const firstTime = await isFirstTimeUser();
      if (firstTime) {
        // Mark as not first time after showing the welcome message
        await markAsNotFirstTime();
        setShowWelcomeMessage(true);
      }
    };
    checkFirstTime();
  }, []);

  // Periodic cache cleanup to prevent memory bloat
  useEffect(() => {
    const cleanupInterval = setInterval(
      () => {
        // Clean up graphs older than 24 hours
        graphCache.cleanupCache(24 * 60 * 60 * 1000);
      },
      60 * 60 * 1000,
    ); // Run every hour

    return () => clearInterval(cleanupInterval);
  }, [graphCache]);

  // Handle cache clearing on refresh
  const handleRefreshWithCacheClear = async () => {
    try {
      // Clear all persistent cache entries for this extension.
      await clearAllCached();

      // Refresh favorites data
      await favorites.refreshFavorites();

      // Show success toast
      await showToast({
        style: Toast.Style.Success,
        title: "Refreshed",
        message: "All data and caches have been cleared and reloaded",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Refresh Failed",
        message: String(error),
      });
    }
  };

  const showEmpty =
    favorites.favoritesLoaded &&
    favorites.favorites.length === 0 &&
    search.safeLocations.length === 0 &&
    !search.isLoading;

  // Show favorites immediately when loaded, regardless of weather data status (lazy loading)
  const shouldShowFavorites =
    favorites.favorites.length > 0 &&
    favorites.favoritesLoaded &&
    (!search.searchText.trim() || search.safeLocations.length === 0);

  // Determine if we should show loading state - only true during initial load
  const shouldShowLoading = favorites.isInitialLoad || search.isLoading;

  // Show background loading indicator for favorites
  const showBackgroundLoading = favorites.isBackgroundLoading && !favorites.isInitialLoad;

  // Special loading state for date queries
  const isDateQueryLoading = search.isLoading && search.queryIntent.targetDate;

  // Use the utility function to create location actions
  const createLocationActions = LocationUtils.createLocationActions;

  return (
    <List
      isLoading={shouldShowLoading}
      onSearchTextChange={search.setSearchText}
      searchBarPlaceholder={
        search.queryIntent.targetDate
          ? `Searching for weather on ${search.queryIntent.targetDate.toLocaleDateString()}...`
          : "Search for a location or try 'Oslo fredag', 'London tomorrow'..."
      }
      throttle
      actions={
        <ActionPanel>
          <Action
            title="Refresh & Clear Cache"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={handleRefreshWithCacheClear}
          />
          <Action
            title="Show Welcome Message"
            icon={Icon.Info}
            shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            onAction={() => setShowWelcomeMessage(true)}
          />
          <Action
            title="Hide Welcome Message"
            icon={Icon.Info}
            shortcut={{ modifiers: ["cmd", "shift", "alt"], key: "w" }}
            onAction={() => setShowWelcomeMessage(false)}
          />
        </ActionPanel>
      }
    >
      {/* Welcome message - shown when manually triggered, regardless of favorites/search state */}
      {showWelcomeMessage && !search.searchText.trim() && <WelcomeMessage showActions={false} />}

      {showEmpty ? (
        <>
          {/* Regular empty state */}
          <List.EmptyView
            title={
              search.searchText && search.searchText.trim().length >= UI_THRESHOLDS.SEARCH_MIN_CHARS
                ? `Searching for "${search.searchText}"`
                : search.searchText
                  ? `"${search.searchText}"`
                  : "Search for a location"
            }
            description={
              search.searchText && search.searchText.trim().length < UI_THRESHOLDS.SEARCH_MIN_CHARS
                ? `Enter at least ${UI_THRESHOLDS.SEARCH_MIN_CHARS} characters to search`
                : "Enter a city name or coordinates to get weather information"
            }
          />
        </>
      ) : (
        <>
          {/* Show feedback when no results and insufficient characters */}
          {search.safeLocations.length === 0 &&
            search.searchText &&
            search.searchText.trim().length > 0 &&
            search.searchText.trim().length < UI_THRESHOLDS.SEARCH_MIN_CHARS && (
              <List.Item
                key="min-chars-feedback"
                title={`"${search.searchText}" - More characters needed`}
                subtitle={`Type ${UI_THRESHOLDS.SEARCH_MIN_CHARS - search.searchText.trim().length} more character${UI_THRESHOLDS.SEARCH_MIN_CHARS - search.searchText.trim().length === 1 ? "" : "s"} to search`}
                icon="💡"
                accessories={[
                  {
                    text: `${search.searchText.trim().length}/${UI_THRESHOLDS.SEARCH_MIN_CHARS}`,
                    tooltip: "Characters entered",
                  },
                  {
                    text: `${UI_THRESHOLDS.SEARCH_MIN_CHARS - search.searchText.trim().length} more`,
                    tooltip: "Characters needed",
                  },
                ]}
                actions={ActionPanelBuilders.createWelcomeActions(() => setShowWelcomeMessage(true))}
              />
            )}

          {/* Show special loading state for date queries */}
          {isDateQueryLoading && search.safeLocations.length === 0 && (
            <List.Section title="🔍 Processing Date Query">
              <List.Item
                key="date-query-loading"
                title={`Searching for weather on ${search.queryIntent.targetDate?.toLocaleDateString()}`}
                subtitle="Finding locations and preparing date-specific results..."
                icon="⏳"
                accessories={[
                  {
                    text: "Loading...",
                    icon: Icon.ArrowClockwise,
                  },
                ]}
                actions={ActionPanelBuilders.createWelcomeActions(() => setShowWelcomeMessage(true))}
              />
            </List.Section>
          )}

          {/* Show search results first when actively searching */}
          {search.safeLocations.length > 0 && (
            <List.Section
              title={
                search.queryIntent.targetDate
                  ? `📅 Search Results for ${search.queryIntent.targetDate.toLocaleDateString()} (${search.safeLocations.length})`
                  : `Search Results (${search.safeLocations.length})`
              }
            >
              {search.safeLocations.map((loc) => (
                <List.Item
                  key={LocationUtils.getLocationKey(loc.id, loc.lat, loc.lon)}
                  title={LocationUtils.formatLocationName(loc)}
                  subtitle={
                    search.queryIntent.targetDate
                      ? `Tap to view weather for ${search.queryIntent.targetDate.toLocaleDateString()}`
                      : undefined
                  }
                  icon={search.queryIntent.targetDate ? "📅" : LocationUtils.getLocationEmoji(loc)}
                  accessories={[
                    {
                      text: search.queryIntent.targetDate
                        ? search.queryIntent.targetDate.toLocaleDateString()
                        : `${loc.lat.toFixed(UI_THRESHOLDS.COORDINATE_PRECISION)}, ${loc.lon.toFixed(UI_THRESHOLDS.COORDINATE_PRECISION)}`,
                      icon: search.queryIntent.targetDate ? Icon.Calendar : undefined,
                    },
                  ]}
                  actions={createLocationActions(
                    loc,
                    isLocationFavorite(loc),
                    async () => {
                      try {
                        if (isLocationFavorite(loc)) {
                          const fav = LocationUtils.createFavoriteFromSearchResult(
                            loc.id,
                            loc.displayName,
                            loc.lat,
                            loc.lon,
                          );
                          await favorites.removeFavoriteLocation(fav);
                          await ToastMessages.favoriteRemoved(loc.displayName);
                        } else {
                          const fav = LocationUtils.createFavoriteFromSearchResult(
                            loc.id,
                            loc.displayName,
                            loc.lat,
                            loc.lon,
                          );
                          await favorites.addFavoriteLocation(fav);
                          await ToastMessages.favoriteAdded(loc.displayName);
                        }
                      } catch (error) {
                        DebugLogger.error("Error handling favorite toggle:", error);
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Error",
                          message: "Failed to update favorite. Please try again.",
                        });
                      }
                    },
                    () => setShowWelcomeMessage(true),
                    search.queryIntent.targetDate,
                    undefined, // onFavoriteChange - not needed for search results
                  )}
                />
              ))}
            </List.Section>
          )}

          {/* Show "no results" message only when search has completed and returned no results */}
          {!search.isLoading &&
            search.searchText.trim().length >= UI_THRESHOLDS.SEARCH_MIN_CHARS &&
            search.safeLocations.length === 0 && (
              <List.EmptyView
                title={`No results found for "${search.searchText}"`}
                description="Try a different location name or check your spelling"
              />
            )}

          {/* Show favorites only when not actively searching or when no search results */}
          {shouldShowFavorites && (
            <List.Section title={showBackgroundLoading ? "Favorites (Loading weather data...)" : "Favorites"}>
              {favorites.favorites.map((fav) => {
                const key = LocationUtils.getLocationKey(fav.id, fav.lat, fav.lon);
                const favoriteId = fav.id;
                const state: FavoriteRenderState = {
                  favorite: fav,
                  weather: favoriteId ? favorites.getFavoriteWeather(favoriteId, fav.lat, fav.lon) : undefined,
                  error: favoriteId ? favorites.hasFavoriteError(favoriteId, fav.lat, fav.lon) : false,
                  loading: favoriteId ? favorites.isFavoriteLoading(favoriteId, fav.lat, fav.lon) : false,
                  sunTimes: favoriteId ? favorites.getFavoriteSunTimes(favoriteId, fav.lat, fav.lon) : undefined,
                };

                return (
                  <List.Item
                    key={key}
                    title={fav.name}
                    subtitle={favoriteSubtitle(state)}
                    icon={favoriteIcon(state)}
                    accessories={favoriteAccessories(state)}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="Open Forecast"
                          icon={Icon.Clock}
                          target={
                            <LazyForecastView
                              locationId={fav.id}
                              name={fav.name}
                              lat={fav.lat}
                              lon={fav.lon}
                              onFavoriteChange={favorites.refreshFavorites}
                              onShowWelcome={() => setShowWelcomeMessage(true)}
                            />
                          }
                        />
                        <Action
                          title="Show Current Weather"
                          icon={Icon.Wind}
                          onAction={async () => {
                            try {
                              const ts: TimeseriesEntry = await getWeather(fav.lat, fav.lon);
                              await showToast({
                                style: Toast.Style.Success,
                                title: `Now at ${fav.name}`,
                                message: WeatherFormatters.formatWeatherToast(ts),
                              });
                            } catch (error) {
                              await ToastMessages.weatherLoadFailed(error);
                            }
                          }}
                        />
                        <Action
                          title="Remove from Favorites"
                          icon={Icon.StarDisabled}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                          onAction={async () => {
                            try {
                              await favorites.removeFavoriteLocation(fav);
                              await ToastMessages.favoriteRemoved(fav.name);
                            } catch (error) {
                              DebugLogger.error("Error removing favorite:", error);
                              showToast({
                                style: Toast.Style.Failure,
                                title: "Error",
                                message: "Failed to remove favorite. Please try again.",
                              });
                            }
                          }}
                        />
                        <Action
                          title="Move up"
                          icon={Icon.ArrowUp}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                          onAction={async () => {
                            await favorites.moveFavoriteUp(fav);
                          }}
                        />
                        <Action
                          title="Move Down"
                          icon={Icon.ArrowDown}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                          onAction={async () => {
                            await favorites.moveFavoriteDown(fav);
                          }}
                        />

                        <Action
                          title="Show Welcome Message"
                          icon={Icon.Info}
                          onAction={() => setShowWelcomeMessage(true)}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

interface FavoriteRenderState {
  favorite: FavoriteLocation;
  weather: TimeseriesEntry | undefined;
  error: boolean;
  loading: boolean;
  sunTimes: SunTimes | undefined;
}

function favoriteSubtitle({ favorite, weather, error, loading }: FavoriteRenderState): string {
  if (!favorite.id) return "Invalid favorite";
  if (weather) {
    return TemperatureFormatter.format(weather) || "⚠️ Temperature unavailable";
  }
  if (error) {
    return "⚠️ Data fetch failed";
  }
  if (loading) {
    return "Loading weather...";
  }
  // Show coordinates when no weather data yet (lazy loading)
  return `${favorite.lat.toFixed(2)}, ${favorite.lon.toFixed(2)}`;
}

function favoriteIcon({ favorite, weather, error, loading }: FavoriteRenderState): string {
  if (!favorite.id) return "❌";
  if (weather) {
    return iconForSymbol(weather) ?? "📍";
  }
  if (error) {
    return "⚠️";
  }
  if (loading) {
    return "⏳";
  }
  // Show neutral location icon when no weather data yet (lazy loading)
  return "📍";
}

function favoriteAccessories({ favorite, weather, loading, sunTimes }: FavoriteRenderState) {
  if (!favorite.id) return undefined;
  if (weather) {
    return formatAccessories(weather, sunTimes);
  }
  if (loading) {
    return [{ text: "Loading...", icon: Icon.ArrowClockwise }];
  }
  // No accessories when no weather data yet (lazy loading)
  return undefined;
}

// Use the utility function instead of local implementation
const formatAccessories = WeatherFormatters.formatAccessories;
