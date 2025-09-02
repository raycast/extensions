import { useEffect, useState, useCallback } from "react";
import { Action, ActionPanel, List, Icon, showToast, Toast } from "@raycast/api";
import ForecastView from "./forecast";
import GraphView from "./graph";
import WelcomeMessage from "./components/welcome-message";

import { searchLocations, type LocationResult } from "./location-search";
import { getWeather, type TimeseriesEntry } from "./weather-client";
import { parseQueryIntent, type QueryIntent } from "./query-intent";
import {
  addFavorite,
  isFavorite,
  removeFavorite,
  moveFavoriteUp,
  moveFavoriteDown,
  type FavoriteLocation,
  getFavorites,
  isFirstTimeUser,
  markAsNotFirstTime,
} from "./storage";
import { getSunTimes, type SunTimes } from "./sunrise-client";

import { iconForSymbol } from "./weather-emoji";
import { formatTemp } from "./weather-utils";

import { useNetworkTest } from "./hooks/useNetworkTest";

import { ToastMessages } from "./utils/toast-utils";
import { WeatherFormatters } from "./utils/weather-formatters";
import { LocationUtils } from "./utils/location-utils";
import { DebugLogger } from "./utils/debug-utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);

  // Simple search state management to avoid infinite loops
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [queryIntent, setQueryIntent] = useState<QueryIntent>({});

  // Search function with query intent parsing and debouncing
  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setLocations([]);
      setQueryIntent({});
      return;
    }

    // Parse query intent to extract location and date information
    const intent = parseQueryIntent(trimmed);
    setQueryIntent(intent);

    // Show toast notification if a date query was successfully parsed
    if (intent.targetDate) {
      const dateStr = intent.targetDate.toLocaleDateString();
      showToast({
        style: Toast.Style.Success,
        title: "📅 Date query detected!",
        message: `Found weather for ${dateStr} - tap a location to open day view`,
      });
    }

    // Use the parsed location query if available, otherwise use the full query
    const locationQuery = intent.locationQuery || trimmed;

    // Require minimum 3 characters before searching
    if (locationQuery.length < 3) {
      setLocations([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchLocations(locationQuery);
      setLocations(results);
    } catch (error) {
      DebugLogger.error("Search failed:", error);
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Ensure locations is always an array
  const safeLocations = locations || [];
  const [favoriteIds, setFavoriteIds] = useState<Record<string, boolean>>({});
  const [favoriteWeather, setFavoriteWeather] = useState<Record<string, TimeseriesEntry | undefined>>({});
  const [sunTimes, setSunTimes] = useState<Record<string, SunTimes>>({});
  const [favoriteErrors, setFavoriteErrors] = useState<Record<string, boolean>>({});
  const networkTest = useNetworkTest();

  useEffect(() => {
    (async () => {
      const favs = await getFavorites();
      setFavorites(favs);
      setFavoritesLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (favorites.length === 0) {
      setFavoriteWeather({});
      setFavoriteErrors({});
      return;
    }
    let cancelled = false;
    const errorTimeouts = new Map<string, NodeJS.Timeout>();

    async function fetchAll() {
      setFavoriteErrors({});

      try {
        const entries = await Promise.all(
          favorites.map(async (fav) => {
            try {
              const ts = await getWeather(fav.lat, fav.lon);
              const key = fav.id ?? (`${fav.lat},${fav.lon}` as string);
              const sun = await getSunTimes(fav.lat, fav.lon).catch(() => ({}) as SunTimes);
              return [key, ts, sun] as const;
            } catch (err) {
              // Clear weather data for this favorite when API fails
              const key = fav.id ?? (`${fav.lat},${fav.lon}` as string);
              console.warn(`Failed to fetch weather for ${fav.name}:`, err);

              // Delay showing error by 150ms to give API time to catch up
              if (!cancelled) {
                const timeout = setTimeout(() => {
                  if (!cancelled) {
                    setFavoriteErrors((prev) => ({ ...prev, [key]: true }));
                  }
                }, 150);
                errorTimeouts.set(key, timeout);
              }

              return [key, undefined, {} as SunTimes] as const;
            }
          }),
        );
        if (!cancelled) {
          const weatherMap: Record<string, TimeseriesEntry | undefined> = {};
          const sunMap: Record<string, SunTimes> = {};
          for (const [key, ts, sun] of entries) {
            weatherMap[key] = ts;
            sunMap[key] = sun;
          }
          setFavoriteWeather(weatherMap);
          setSunTimes(sunMap);
        }
      } catch (err) {
        DebugLogger.error("Error fetching favorites:", err);
      }
    }
    fetchAll();
    return () => {
      cancelled = true;
      // Clear all error timeouts
      errorTimeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [favorites]);

  // Trigger search when search text changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const q = searchText.trim();
      if (q) {
        // Parse query intent to check if we have a valid location query
        const intent = parseQueryIntent(q);
        const locationQuery = intent.locationQuery || q;

        if (locationQuery.length >= 3) {
          performSearch(q);
        } else {
          // Clear locations but keep query intent for display
          setLocations([]);
          setIsLoading(false);
        }
      } else {
        setLocations([]);
        setQueryIntent({});
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchText, performSearch]);

  // Update favorite flags when search results change
  useEffect(() => {
    if (safeLocations.length > 0) {
      (async () => {
        const map: Record<string, boolean> = {};
        for (const r of safeLocations) {
          const favLike = LocationUtils.createFavoriteFromSearchResult(r.id, r.displayName, r.lat, r.lon);
          map[r.id] = await isFavorite(favLike);
        }
        setFavoriteIds(map);
      })();
    } else {
      setFavoriteIds({});
    }
  }, [safeLocations]);

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

  const showEmpty = favoritesLoaded && favorites.length === 0 && safeLocations.length === 0 && !isLoading;

  // Only show favorites when not actively searching or when search is empty
  const shouldShowFavorites = favorites.length > 0 && (!searchText.trim() || safeLocations.length === 0);

  // Determine if we should show loading state
  const shouldShowLoading = !favoritesLoaded || isLoading;

  // Use the utility function to create location actions
  const createLocationActions = LocationUtils.createLocationActions;

  return (
    <List
      isLoading={shouldShowLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for a location or try 'Oslo fredag', 'London tomorrow'..."
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
      {showWelcomeMessage && !searchText.trim() && <WelcomeMessage showActions={false} />}

      {showEmpty ? (
        <>
          {/* Regular empty state */}
          <List.EmptyView
            title={
              searchText && searchText.trim().length >= 3
                ? `Searching for "${searchText}"`
                : searchText
                  ? `"${searchText}"`
                  : "Search for a location"
            }
            description={
              searchText && searchText.trim().length < 3
                ? "Enter at least 3 characters to search"
                : "Enter a city name or coordinates to get weather information"
            }
          />
        </>
      ) : (
        <>
          {/* Show feedback when no results and insufficient characters */}
          {safeLocations.length === 0 && searchText && searchText.trim().length > 0 && searchText.trim().length < 3 && (
            <List.Item
              key="min-chars-feedback"
              title={`"${searchText}" - More characters needed`}
              subtitle={`Type ${3 - searchText.trim().length} more character${3 - searchText.trim().length === 1 ? "" : "s"} to search`}
              icon="💡"
              accessories={[
                { text: `${searchText.trim().length}/3`, tooltip: "Characters entered" },
                { text: `${3 - searchText.trim().length} more`, tooltip: "Characters needed" },
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

          {/* Show search results first when actively searching */}
          {safeLocations.length > 0 && (
            <List.Section title={`Search Results (${safeLocations.length})`}>
              {safeLocations.map((loc) => (
                <List.Item
                  key={loc.id}
                  title={loc.displayName}
                  accessories={[{ text: `${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)}` }]}
                  actions={createLocationActions(
                    loc.displayName,
                    loc.lat,
                    loc.lon,
                    favoriteIds[loc.id],
                    async () => {
                      if (favoriteIds[loc.id]) {
                        const fav = LocationUtils.createFavoriteFromSearchResult(
                          loc.id,
                          loc.displayName,
                          loc.lat,
                          loc.lon,
                        );
                        await removeFavorite(fav);
                        setFavoriteIds((m) => ({ ...m, [loc.id]: false }));
                        setFavorites(await getFavorites());
                        await ToastMessages.favoriteRemoved(loc.displayName);
                      } else {
                        const fav = LocationUtils.createFavoriteFromSearchResult(
                          loc.id,
                          loc.displayName,
                          loc.lat,
                          loc.lon,
                        );
                        await addFavorite(fav);
                        setFavoriteIds((m) => ({ ...m, [loc.id]: true }));
                        setFavorites(await getFavorites());
                        await ToastMessages.favoriteAdded(loc.displayName);
                      }
                    },
                    () => setShowWelcomeMessage(true),
                    queryIntent.targetDate,
                  )}
                />
              ))}
            </List.Section>
          )}

          {/* Show "no results" message only when search has completed and returned no results */}
          {!isLoading && searchText.trim().length >= 3 && safeLocations.length === 0 && (
            <List.EmptyView
              title={`No results found for "${searchText}"`}
              description="Try a different location name or check your spelling"
            />
          )}

          {/* Show favorites only when not actively searching or when no search results */}
          {shouldShowFavorites && (
            <List.Section title="Favorites">
              {favorites.map((fav) => (
                <List.Item
                  key={fav.id ?? `${fav.lat},${fav.lon}`}
                  title={fav.name}
                  subtitle={
                    favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`]
                      ? formatTemp(favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`])
                      : favoriteErrors[fav.id ?? `${fav.lat},${fav.lon}`]
                        ? "⚠️ Data fetch failed"
                        : "Loading..."
                  }
                  icon={
                    favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`]
                      ? iconForSymbol(favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`])
                      : favoriteErrors[fav.id ?? `${fav.lat},${fav.lon}`]
                        ? "⚠️"
                        : "⏳"
                  }
                  accessories={
                    favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`]
                      ? formatAccessories(
                          favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`],
                          sunTimes[fav.id ?? `${fav.lat},${fav.lon}`],
                        )
                      : undefined
                  }
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Open Forecast"
                        target={
                          <ForecastView
                            name={fav.name}
                            lat={fav.lat}
                            lon={fav.lon}
                            onShowWelcome={() => setShowWelcomeMessage(true)}
                          />
                        }
                      />
                      <Action
                        title="Show Current Weather"
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
                      <Action.Push
                        title="Open Graph"
                        icon={Icon.BarChart}
                        shortcut={{ modifiers: ["cmd"], key: "g" }}
                        target={
                          <GraphView
                            name={fav.name}
                            lat={fav.lat}
                            lon={fav.lon}
                            onShowWelcome={() => setShowWelcomeMessage(true)}
                          />
                        }
                      />
                      <Action
                        title="Remove from Favorites"
                        icon={Icon.StarDisabled}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                        onAction={async () => {
                          await removeFavorite(fav);
                          setFavorites(await getFavorites());
                          if (fav.id) setFavoriteIds((m) => ({ ...m, [fav.id as string]: false }));
                          await ToastMessages.favoriteRemoved(fav.name);
                        }}
                      />
                      <Action
                        title="Move up"
                        icon={Icon.ArrowUp}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                        onAction={async () => {
                          await moveFavoriteUp(fav);
                          setFavorites(await getFavorites());
                        }}
                      />
                      <Action
                        title="Move Down"
                        icon={Icon.ArrowDown}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                        onAction={async () => {
                          await moveFavoriteDown(fav);
                          setFavorites(await getFavorites());
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
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

// Use the utility function instead of local implementation
const formatAccessories = WeatherFormatters.formatAccessories;
