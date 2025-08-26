import { useEffect, useMemo, useState, useCallback } from "react";
import { Action, ActionPanel, List, showToast, Toast, Icon, Image } from "@raycast/api";
import { formatPrecip, formatTemperatureCelsius, formatWindSpeed, getUnits, getFeatureFlags } from "./units";
import { FavoriteToggleAction } from "./components/FavoriteToggleAction";
import ForecastView from "./forecast";
import GraphView from "./graph";
import { searchLocations, type LocationResult } from "./location-search";
import { getWeather, type TimeseriesEntry } from "./weather-client";
import { precipitationAmount } from "./utils-forecast";
import { addFavorite, isFavorite, removeFavorite, type FavoriteLocation, getFavorites } from "./storage";
import { getSunTimes, type SunTimes } from "./sunrise-client";
import DayQuickView from "./day-view";
import { parseQueryIntent } from "./query-intent";
import { generateDaySummary, formatSummary } from "./weather-summary";
import { getForecast } from "./weather-client";
import { iconForSymbol } from "./weather-emoji";
import { directionFromDegrees, filterToDate, formatTemp } from "./weather-utils";
import { useDelayedError } from "./hooks/useDelayedError";
import { useNetworkTest } from "./hooks/useNetworkTest";
import { formatDate, formatTime } from "./utils/date-utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);

  // Simple search state management to avoid infinite loops
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Simple search function with debouncing
  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setLocations([]);
      return;
    }

    // Require minimum 3 characters before searching
    if (trimmed.length < 3) {
      setLocations([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchLocations(trimmed);
      setLocations(results);
    } catch (error) {
      console.error("Search failed:", error);
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
  const [quickWeather, setQuickWeather] = useState<TimeseriesEntry | undefined>(undefined);
  const [quickDayForecast, setQuickDayForecast] = useState<TimeseriesEntry[]>([]);
  const [favoriteErrors, setFavoriteErrors] = useState<Record<string, boolean>>({});
  const { showError: showQuickViewError, setErrorWithDelay: setQuickViewErrorWithDelay } = useDelayedError();
  const networkTest = useNetworkTest();

  useEffect(() => {
    (async () => setFavorites(await getFavorites()))();
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
        console.error("Error fetching favorites:", err);
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
      const parsed = parseQueryIntent(searchText);
      const q = (parsed.locationQuery ?? searchText).trim();
      if (q && q.length >= 3) {
        performSearch(q);
      } else if (q && q.length > 0 && q.length < 3) {
        // Clear locations but don't show toast feedback
        setLocations([]);
        setIsLoading(false);
      } else {
        setLocations([]);
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
          const favLike: FavoriteLocation = { id: r.id, name: r.displayName, lat: r.lat, lon: r.lon };
          map[r.id] = await isFavorite(favLike);
        }
        setFavoriteIds(map);
      })();
    } else {
      setFavoriteIds({});
    }
  }, [safeLocations]);

  const intent = useMemo(() => parseQueryIntent(searchText), [searchText]);

  const quickTarget = useMemo(() => {
    const date = intent.targetDate;
    const q = intent.locationQuery?.toLowerCase().trim();
    if (!date || !q) return undefined;
    // Prefer favorites that include query
    const fav = favorites.find((f) => f.name.toLowerCase().includes(q));
    if (fav) return { name: fav.name, lat: fav.lat, lon: fav.lon, date } as const;
    // Fall back to first matching search result
    const loc = safeLocations.find((l) => l.displayName.toLowerCase().includes(q));
    if (loc) return { name: loc.displayName, lat: loc.lat, lon: loc.lon, date } as const;
    return undefined;
  }, [favorites, locations, intent]);

  // Fetch current weather for Quick View to display icon and accessories like Favorites
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!quickTarget) {
        setQuickWeather(undefined);
        setQuickDayForecast([]);
        setQuickViewErrorWithDelay(null);
        return;
      }

      setQuickViewErrorWithDelay(null);

      try {
        const [ts, forecast] = await Promise.all([
          getWeather(quickTarget.lat, quickTarget.lon),
          getForecast(quickTarget.lat, quickTarget.lon),
        ]);
        if (!cancelled) {
          setQuickWeather(ts);
          setQuickDayForecast(forecast);
          setQuickViewErrorWithDelay(null);
        }
      } catch (err) {
        if (!cancelled) {
          // Clear weather data when API fails
          setQuickWeather(undefined);
          setQuickDayForecast([]);
          console.warn(`Failed to fetch weather for Quick View (${quickTarget.name}):`, err);

          // Use the delayed error hook
          setQuickViewErrorWithDelay("Failed to fetch weather data");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quickTarget?.lat, quickTarget?.lon]);

  // Generate day summary for Quick View
  const daySummary = useMemo(() => {
    if (!quickTarget || quickDayForecast.length === 0) return undefined;

    // Filter forecast to just the target day
    const daySeries = filterToDate(quickDayForecast, quickTarget.date);

    return generateDaySummary(daySeries);
  }, [quickTarget, quickDayForecast]);

  // Check if the requested date has forecast data
  const hasForecastData = useMemo(() => {
    if (!quickTarget || quickDayForecast.length === 0) return false;

    const daySeries = filterToDate(quickDayForecast, quickTarget.date);

    return daySeries.length > 0;
  }, [quickTarget, quickDayForecast]);

  // Check if there was an error fetching weather data
  const hasWeatherError = useMemo(() => {
    return quickTarget && showQuickViewError;
  }, [quickTarget, showQuickViewError]);

  // Debug: Log network test results and show user-friendly notifications
  useEffect(() => {
    if (networkTest.error) {
      console.error("Network test results:", networkTest);

      // Show user-friendly notifications for critical API failures
      if (!networkTest.metApi) {
        showToast({
          style: Toast.Style.Failure,
          title: "Weather API Unavailable",
          message: "Unable to connect to weather service. Some features may not work properly.",
        });
      }

      if (!networkTest.nominatim) {
        showToast({
          style: Toast.Style.Failure,
          title: "Location Search Unavailable",
          message: "Unable to connect to location service. You may not be able to search for new locations.",
        });
      }

      // Only show general connectivity warning if both critical services fail
      if (!networkTest.metApi && !networkTest.nominatim) {
        showToast({
          style: Toast.Style.Failure,
          title: "Network Connectivity Issues",
          message: "Multiple services are unavailable. Please check your internet connection.",
        });
      }
    }
  }, [networkTest]);

  const showEmpty = favorites.length === 0 && safeLocations.length === 0;

  // Only show favorites when not actively searching or when search is empty
  const shouldShowFavorites = favorites.length > 0 && (!searchText.trim() || safeLocations.length === 0);

  // Reusable function to create location actions
  const createLocationActions = (
    name: string,
    lat: number,
    lon: number,
    isFavorite: boolean,
    onFavoriteToggle: () => void,
  ) => (
    <ActionPanel>
      <Action.Push title="Open Forecast" icon={Icon.Sun} target={<ForecastView name={name} lat={lat} lon={lon} />} />
      <Action
        title="Show Current Weather"
        icon={Icon.Sun}
        onAction={async () => {
          try {
            const ts: TimeseriesEntry = await getWeather(lat, lon);
            await showToast({
              style: Toast.Style.Success,
              title: `Now at ${name}`,
              message: formatWeatherToast(ts),
            });
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to load weather",
              message: String((error as Error)?.message ?? error),
            });
          }
        }}
      />
      <Action.Push
        title="Open Graph"
        icon={Icon.BarChart}
        shortcut={{ modifiers: ["cmd"], key: "g" }}
        target={<GraphView name={name} lat={lat} lon={lon} />}
      />
      <FavoriteToggleAction isFavorite={isFavorite} onToggle={onFavoriteToggle} />
    </ActionPanel>
  );

  console.log({ isLoading });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for a location (min. 3 characters)..."
      throttle
    >
      {showEmpty ? (
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
            />
          )}

          {quickTarget && (
            <List.Section title="Quick View">
              <List.Item
                key={`qv:${quickTarget.name}:${quickTarget.date.toISOString().slice(0, 10)}`}
                title={`${quickTarget.name} — ${formatDate(quickTarget.date, "WEEKDAY_ONLY")}`}
                subtitle={`${formatDate(quickTarget.date, "MONTH_DAY")} • ${hasWeatherError ? "⚠️ Data fetch failed" : hasForecastData ? (daySummary ? formatSummary(daySummary) : "Loading...") : "⚠️ No forecast data available"}`}
                icon={hasWeatherError ? "⚠️" : hasForecastData ? iconForSymbol(quickWeather) : "🤷"}
                accessories={
                  hasWeatherError ? undefined : hasForecastData ? formatAccessories(quickWeather) : undefined
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Open 1-Day View"
                      target={
                        <DayQuickView
                          name={quickTarget.name}
                          lat={quickTarget.lat}
                          lon={quickTarget.lon}
                          date={quickTarget.date}
                        />
                      }
                    />
                    <Action.Push
                      title="Open Full Forecast"
                      target={<ForecastView name={quickTarget.name} lat={quickTarget.lat} lon={quickTarget.lon} />}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
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
                        // Note: Network tests will re-run when the component re-mounts
                        // For now, just show a toast message
                        showToast({
                          style: Toast.Style.Success,
                          title: "Network Tests",
                          message: "Tests will re-run when you restart the extension",
                        });
                      }}
                    />
                    <Action
                      title="Show Error Details"
                      icon={Icon.Info}
                      onAction={async () => {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Network Test Errors",
                          message: networkTest.error || "Unknown network connectivity issues",
                        });
                      }}
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
                  actions={createLocationActions(loc.displayName, loc.lat, loc.lon, favoriteIds[loc.id], async () => {
                    if (favoriteIds[loc.id]) {
                      const fav: FavoriteLocation = {
                        id: loc.id,
                        name: loc.displayName,
                        lat: loc.lat,
                        lon: loc.lon,
                      };
                      await removeFavorite(fav);
                      setFavoriteIds((m) => ({ ...m, [loc.id]: false }));
                      setFavorites(await getFavorites());
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Removed from Favorites",
                        message: `${loc.displayName} has been removed from your favorites`,
                      });
                    } else {
                      const fav: FavoriteLocation = {
                        id: loc.id,
                        name: loc.displayName,
                        lat: loc.lat,
                        lon: loc.lon,
                      };
                      await addFavorite(fav);
                      setFavoriteIds((m) => ({ ...m, [loc.id]: true }));
                      setFavorites(await getFavorites());
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Added to Favorites",
                        message: `${loc.displayName} has been added to your favorites`,
                      });
                    }
                  })}
                />
              ))}
            </List.Section>
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
                  actions={createLocationActions(fav.name, fav.lat, fav.lon, true, async () => {
                    await removeFavorite(fav);
                    setFavorites(await getFavorites());
                    if (fav.id) setFavoriteIds((m) => ({ ...m, [fav.id as string]: false }));
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Removed from Favorites",
                      message: `${fav.name} has been removed from your favorites`,
                    });
                  })}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function formatWeatherToast(ts: TimeseriesEntry): string {
  const details = ts?.data?.instant?.details ?? {};
  const temp = formatTemperatureCelsius(details.air_temperature) ?? "N/A";
  const windSpeed = formatWindSpeed(details.wind_speed);
  const windDir =
    typeof details.wind_from_direction === "number"
      ? (() => {
          const d = directionFromDegrees(details.wind_from_direction);
          return `${d.arrow} ${d.name}`;
        })()
      : undefined;
  const precip = precipitationAmount(ts);
  const precipText = formatPrecip(precip);
  return [temp, windSpeed && `wind ${windSpeed}`, windDir && `from ${windDir}`, precipText && `precip ${precipText}`]
    .filter(Boolean)
    .join("  •  ");
}

function formatAccessories(
  ts: TimeseriesEntry | undefined,
  sun?: SunTimes,
): Array<{ tag?: string | Image; text?: string; tooltip?: string }> | undefined {
  const details = ts?.data?.instant?.details ?? {};
  const acc: Array<{ tag?: string | Image; text?: string; tooltip?: string }> = [];
  const units = getUnits();
  const flags = getFeatureFlags();
  const wind = formatWindSpeed(details.wind_speed, units);
  if (wind) acc.push({ tag: `💨 ${wind}`, tooltip: "Wind" });
  if (flags.showWindDirection && typeof details.wind_from_direction === "number") {
    const dir = directionFromDegrees(details.wind_from_direction);
    acc.push({ tag: `🧭 ${dir.arrow} ${dir.name}`, tooltip: `Direction ${Math.round(details.wind_from_direction)}°` });
  }
  const precip = precipitationAmount(ts);
  const p = formatPrecip(precip, units);
  if (p) acc.push({ tag: `☔ ${p}`, tooltip: "Precipitation" });
  if (flags.showSunTimes) {
    const sr = sun?.sunrise ? new Date(sun.sunrise) : undefined;
    const ss = sun?.sunset ? new Date(sun.sunset) : undefined;
    if (sr)
      acc.push({
        tag: `🌅 ${formatTime(sr, "MILITARY")}`,
        tooltip: "Sunrise",
      });
    if (ss)
      acc.push({
        tag: `🌇 ${formatTime(ss, "MILITARY")}`,
        tooltip: "Sunset",
      });
  }
  return acc.length ? acc : undefined;
}
