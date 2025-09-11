import { useEffect, useState } from "react";
import { Action, ActionPanel, List, Icon, showToast, Toast } from "@raycast/api";
import ForecastView from "./forecast";
import WelcomeMessage from "./components/welcome-message";
import { ErrorBoundary } from "./components/error-boundary";
import { SearchErrorFallback, FavoritesErrorFallback } from "./components/error-fallbacks";

import { getWeather, type TimeseriesEntry } from "./weather-client";
import { isFirstTimeUser, markAsNotFirstTime } from "./storage";

import { iconForSymbol } from "./weather-emoji";
import { formatTemp } from "./weather-utils";

import { useNetworkTest } from "./hooks/useNetworkTest";
import { useSearch } from "./hooks/useSearch";
import { useFavorites } from "./hooks/useFavorites";
import { useFavoriteIds } from "./hooks/useFavoriteIds";
import { getUIThresholds } from "./config/weather-config";

import { ToastMessages } from "./utils/toast-utils";
import { WeatherFormatters } from "./utils/weather-formatters";
import { LocationUtils } from "./utils/location-utils";
import { DebugLogger } from "./utils/debug-utils";

export default function Command() {
  // UI state
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);

  // Custom hooks for different responsibilities
  const search = useSearch();
  const favorites = useFavorites();
  const favoriteIds = useFavoriteIds();
  const networkTest = useNetworkTest();

  // Update favorite IDs when search results change
  useEffect(() => {
    favoriteIds.refreshFavoriteIds(search.safeLocations);
  }, [search.safeLocations, favoriteIds.refreshFavoriteIds]);

  // Debug: Log network test results and show user-friendly notifications
  useEffect(() => {
    if (networkTest.error) {
      DebugLogger.error("Network test results:", networkTest);

      // Show user-friendly notifications for critical API failures
      if (!networkTest.metApi) {
        ToastMessages.weatherApiUnavailable();
      }

      if (!networkTest.nominatim) {
        ToastMessages.locationApiUnavailable();
      }

      // Only show general connectivity warning if both critical services fail
      if (!networkTest.metApi && !networkTest.nominatim) {
        ToastMessages.networkConnectivityIssues();
      }
    }
  }, [networkTest]);

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
            title="Show Welcome Message"
            icon={Icon.Info}
            onAction={() => setShowWelcomeMessage(true)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
          />
          <Action
            title="Hide Welcome Message"
            icon={Icon.Info}
            onAction={() => setShowWelcomeMessage(false)}
            shortcut={{ modifiers: ["cmd", "shift", "alt"], key: "w" }}
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
              search.searchText && search.searchText.trim().length >= getUIThresholds().SEARCH_MIN_CHARS
                ? `Searching for "${search.searchText}"`
                : search.searchText
                  ? `"${search.searchText}"`
                  : "Search for a location"
            }
            description={
              search.searchText && search.searchText.trim().length < getUIThresholds().SEARCH_MIN_CHARS
                ? `Enter at least ${getUIThresholds().SEARCH_MIN_CHARS} characters to search`
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
            search.searchText.trim().length < getUIThresholds().SEARCH_MIN_CHARS && (
              <List.Item
                key="min-chars-feedback"
                title={`"${search.searchText}" - More characters needed`}
                subtitle={`Type ${getUIThresholds().SEARCH_MIN_CHARS - search.searchText.trim().length} more character${getUIThresholds().SEARCH_MIN_CHARS - search.searchText.trim().length === 1 ? "" : "s"} to search`}
                icon="💡"
                accessories={[
                  {
                    text: `${search.searchText.trim().length}/${getUIThresholds().SEARCH_MIN_CHARS}`,
                    tooltip: "Characters entered",
                  },
                  {
                    text: `${getUIThresholds().SEARCH_MIN_CHARS - search.searchText.trim().length} more`,
                    tooltip: "Characters needed",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Show Welcome Message"
                      icon={Icon.Info}
                      onAction={() => setShowWelcomeMessage(true)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                    />
                  </ActionPanel>
                }
              />
            )}

          {/* Network Status Section - Show when there are connectivity issues */}
          {networkTest.error && (
            <List.Section title="⚠️ Network Status">
              <List.Item
                title="Service Connectivity Issues Detected"
                subtitle="Some features may not work properly"
                icon="⚠️"
                accessories={[
                  {
                    text: networkTest.metApi ? "✅" : "❌",
                    tooltip: networkTest.metApi ? "Weather API: Connected" : "Weather API: Failed",
                  },
                  {
                    text: networkTest.nominatim ? "✅" : "❌",
                    tooltip: networkTest.nominatim ? "Location API: Connected" : "Location API: Failed",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Retry Network Tests"
                      icon={Icon.ArrowClockwise}
                      onAction={() => {
                        // Network tests will re-run when the component re-mounts
                        // Show a toast message to indicate retry action
                        ToastMessages.networkTestsRetry();
                      }}
                    />
                    <Action
                      title="Show Error Details"
                      icon={Icon.Info}
                      onAction={async () => {
                        await ToastMessages.networkTestErrors(
                          networkTest.error || "Unknown network connectivity issues",
                        );
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
            </List.Section>
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
                actions={
                  <ActionPanel>
                    <Action
                      title="Show Welcome Message"
                      icon={Icon.Info}
                      onAction={() => setShowWelcomeMessage(true)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}

          {/* Show search results first when actively searching */}
          {search.safeLocations.length > 0 && (
            <ErrorBoundary
              componentName="Search Results"
              fallback={<SearchErrorFallback componentName="Search Results" />}
            >
              <List.Section
                title={
                  search.queryIntent.targetDate
                    ? `📅 Search Results for ${search.queryIntent.targetDate.toLocaleDateString()} (${search.safeLocations.length})`
                    : `Search Results (${search.safeLocations.length})`
                }
              >
                {search.safeLocations.map((loc) => (
                  <List.Item
                    key={loc.id}
                    title={loc.displayName}
                    subtitle={
                      search.queryIntent.targetDate
                        ? `Tap to view weather for ${search.queryIntent.targetDate.toLocaleDateString()}`
                        : undefined
                    }
                    icon={search.queryIntent.targetDate ? "📅" : "📍"}
                    accessories={[
                      {
                        text: search.queryIntent.targetDate
                          ? search.queryIntent.targetDate.toLocaleDateString()
                          : `${loc.lat.toFixed(getUIThresholds().COORDINATE_PRECISION)}, ${loc.lon.toFixed(getUIThresholds().COORDINATE_PRECISION)}`,
                        icon: search.queryIntent.targetDate ? Icon.Calendar : undefined,
                      },
                    ]}
                    actions={createLocationActions(
                      loc.displayName,
                      loc.lat,
                      loc.lon,
                      favoriteIds.favoriteIds[loc.id],
                      async () => {
                        if (favoriteIds.favoriteIds[loc.id]) {
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
                      },
                      () => setShowWelcomeMessage(true),
                      search.queryIntent.targetDate,
                    )}
                  />
                ))}
              </List.Section>
            </ErrorBoundary>
          )}

          {/* Show "no results" message only when search has completed and returned no results */}
          {!search.isLoading &&
            search.searchText.trim().length >= getUIThresholds().SEARCH_MIN_CHARS &&
            search.safeLocations.length === 0 && (
              <List.EmptyView
                title={`No results found for "${search.searchText}"`}
                description="Try a different location name or check your spelling"
              />
            )}

          {/* Show favorites only when not actively searching or when no search results */}
          {shouldShowFavorites && (
            <ErrorBoundary componentName="Favorites" fallback={<FavoritesErrorFallback componentName="Favorites" />}>
              <List.Section title="Favorites">
                {favorites.favorites.map((fav) => {
                  const key = LocationUtils.getLocationKey(fav.id, fav.lat, fav.lon);

                  return (
                    <List.Item
                      key={key}
                      title={fav.name}
                      subtitle={(() => {
                        if (!fav.id) return "Invalid favorite";
                        const weather = favorites.getFavoriteWeather(fav.id, fav.lat, fav.lon);
                        const error = favorites.hasFavoriteError(fav.id, fav.lat, fav.lon);
                        const loading = favorites.isFavoriteLoading(fav.id, fav.lat, fav.lon);

                        if (weather) {
                          const temp = formatTemp(weather);
                          return temp || "⚠️ Temperature unavailable";
                        }

                        if (error) {
                          return "⚠️ Data fetch failed";
                        }

                        if (loading) {
                          return "Loading weather...";
                        }

                        // Show coordinates when no weather data yet (lazy loading)
                        return `${fav.lat.toFixed(2)}, ${fav.lon.toFixed(2)}`;
                      })()}
                      icon={(() => {
                        if (!fav.id) return "❌";
                        const weather = favorites.getFavoriteWeather(fav.id, fav.lat, fav.lon);
                        const error = favorites.hasFavoriteError(fav.id, fav.lat, fav.lon);
                        const loading = favorites.isFavoriteLoading(fav.id, fav.lat, fav.lon);

                        if (weather) {
                          return iconForSymbol(weather);
                        }
                        if (error) {
                          return "⚠️";
                        }
                        if (loading) {
                          return "⏳";
                        }
                        // Show neutral location icon when no weather data yet (lazy loading)
                        return "📍";
                      })()}
                      accessories={(() => {
                        if (!fav.id) return undefined;
                        const weather = favorites.getFavoriteWeather(fav.id, fav.lat, fav.lon);
                        const sunTimes = favorites.getFavoriteSunTimes(fav.id, fav.lat, fav.lon);
                        const loading = favorites.isFavoriteLoading(fav.id, fav.lat, fav.lon);

                        if (weather) {
                          return formatAccessories(weather, sunTimes);
                        }

                        if (loading) {
                          return [{ text: "Loading...", icon: Icon.ArrowClockwise }];
                        }

                        // No accessories when no weather data yet (lazy loading)
                        return undefined;
                      })()}
                      actions={
                        <ActionPanel>
                          <Action.Push
                            title="Open Forecast"
                            icon={Icon.Clock}
                            target={
                              <ForecastView
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
                              await favorites.removeFavoriteLocation(fav);
                              await ToastMessages.favoriteRemoved(fav.name);
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
            </ErrorBoundary>
          )}
        </>
      )}
    </List>
  );
}

// Use the utility function instead of local implementation
const formatAccessories = WeatherFormatters.formatAccessories;
