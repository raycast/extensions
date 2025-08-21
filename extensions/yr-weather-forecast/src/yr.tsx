import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, List, showToast, Toast, Icon, Image } from "@raycast/api";
import { formatPrecip, formatTemperatureCelsius, formatWindSpeed, getUnits, getFeatureFlags } from "./units";
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

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Record<string, boolean>>({});
  const [favoriteWeather, setFavoriteWeather] = useState<Record<string, TimeseriesEntry | undefined>>({});
  const [sunTimes, setSunTimes] = useState<Record<string, SunTimes>>({});
  const [quickWeather, setQuickWeather] = useState<TimeseriesEntry | undefined>(undefined);
  const [quickDayForecast, setQuickDayForecast] = useState<TimeseriesEntry[]>([]);
  const [favoriteErrors, setFavoriteErrors] = useState<Record<string, boolean>>({});
  const [quickViewError, setQuickViewError] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const parsed = parseQueryIntent(searchText);
      const q = (parsed.locationQuery ?? searchText).trim();
      if (!q) {
        setLocations([]);
        return;
      }
      setIsLoading(true);
      try {
        const results = await searchLocations(q);
        if (!cancelled) {
          setLocations(results);
          // refresh favorite flags for shown results
          const map: Record<string, boolean> = {};
          for (const r of results) {
            const favLike: FavoriteLocation = { id: r.id, name: r.displayName, lat: r.lat, lon: r.lon };
            map[r.id] = await isFavorite(favLike);
          }
          setFavoriteIds(map);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: String((error as Error)?.message ?? error),
        });
        if (!cancelled) setLocations([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    const handle = setTimeout(run, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchText]);

  const intent = useMemo(() => parseQueryIntent(searchText), [searchText]);

  const quickTarget = useMemo(() => {
    const date = intent.targetDate;
    const q = intent.locationQuery?.toLowerCase().trim();
    if (!date || !q) return undefined;
    // Prefer favorites that include query
    const fav = favorites.find((f) => f.name.toLowerCase().includes(q));
    if (fav) return { name: fav.name, lat: fav.lat, lon: fav.lon, date } as const;
    // Fall back to first matching search result
    const loc = locations.find((l) => l.displayName.toLowerCase().includes(q));
    if (loc) return { name: loc.displayName, lat: loc.lat, lon: loc.lon, date } as const;
    return undefined;
  }, [favorites, locations, intent]);

  // Fetch current weather for Quick View to display icon and accessories like Favorites
  useEffect(() => {
    let cancelled = false;
    let errorTimeout: NodeJS.Timeout;

    (async () => {
      if (!quickTarget) {
        setQuickWeather(undefined);
        setQuickDayForecast([]);
        setQuickViewError(false);
        return;
      }

      setQuickViewError(false);

      try {
        const [ts, forecast] = await Promise.all([
          getWeather(quickTarget.lat, quickTarget.lon),
          getForecast(quickTarget.lat, quickTarget.lon),
        ]);
        if (!cancelled) {
          setQuickWeather(ts);
          setQuickDayForecast(forecast);
          setQuickViewError(false);
        }
      } catch (err) {
        if (!cancelled) {
          // Clear weather data when API fails
          setQuickWeather(undefined);
          setQuickDayForecast([]);
          console.warn(`Failed to fetch weather for Quick View (${quickTarget.name}):`, err);

          // Delay showing error by 150ms to give API time to catch up
          errorTimeout = setTimeout(() => {
            if (!cancelled) {
              setQuickViewError(true);
            }
          }, 150);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (errorTimeout) clearTimeout(errorTimeout);
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
    return quickTarget && quickViewError;
  }, [quickTarget, quickViewError]);

  const showEmpty = favorites.length === 0 && locations.length === 0;

  // Only show favorites when not actively searching or when search is empty
  const shouldShowFavorites = favorites.length > 0 && (!searchText.trim() || locations.length === 0);

  // Limit search results to improve performance and user experience
  const limitedLocations = locations.slice(0, 4);
  const hasMoreResults = locations.length > 4;
  const [showAllResults, setShowAllResults] = useState(false);

  // Reset show all results when search changes
  useEffect(() => {
    setShowAllResults(false);
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for a location..."
      throttle
    >
      {showEmpty ? (
        <List.EmptyView
          title={searchText ? `Searching for "${searchText}"` : "Search for a location"}
          description="Enter a city name or coordinates to get weather information"
        />
      ) : (
        <>
          {quickTarget && (
            <List.Section title="Quick View">
              <List.Item
                key={`qv:${quickTarget.name}:${quickTarget.date.toISOString().slice(0, 10)}`}
                title={`${quickTarget.name} — ${quickTarget.date.toLocaleDateString(undefined, { weekday: "long" })}`}
                subtitle={`${quickTarget.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} • ${hasWeatherError ? "⚠️ Data fetch failed" : hasForecastData ? (daySummary ? formatSummary(daySummary) : "Loading...") : "⚠️ No forecast data available"}`}
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

          {/* Show search results first when actively searching */}
          {locations.length > 0 && (
            <List.Section title="Search Results">
              {(showAllResults ? locations : limitedLocations).map((loc) => (
                <List.Item
                  key={loc.id}
                  title={loc.displayName}
                  accessories={[{ text: `${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)}` }]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Open Forecast"
                        target={<ForecastView name={loc.displayName} lat={loc.lat} lon={loc.lon} />}
                      />
                      <Action
                        title="Show Current Weather"
                        onAction={async () => {
                          try {
                            const ts: TimeseriesEntry = await getWeather(loc.lat, loc.lon);
                            await showToast({
                              style: Toast.Style.Success,
                              title: `Now at ${loc.displayName}`,
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
                        target={<GraphView name={loc.displayName} lat={loc.lat} lon={loc.lon} />}
                      />
                      {favoriteIds[loc.id] ? (
                        <Action
                          title="Remove from Favorites"
                          icon={Icon.StarDisabled}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                          onAction={async () => {
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
                          }}
                        />
                      ) : (
                        <Action
                          title="Add to Favorites"
                          icon={Icon.Star}
                          shortcut={{ modifiers: ["cmd"], key: "f" }}
                          onAction={async () => {
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
                          }}
                        />
                      )}

                      {/* Show All Results action when available */}
                      {hasMoreResults && (
                        <Action
                          title={showAllResults ? "Show Less Results" : "Show All Results"}
                          icon={showAllResults ? Icon.ChevronUp : Icon.ChevronDown}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                          onAction={() => setShowAllResults(!showAllResults)}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              ))}

              {/* Show "Show All Results" or "Show Less" option */}
              {hasMoreResults && (
                <List.Item
                  key="show-all-results"
                  title={showAllResults ? "Show Less Results" : `Show All ${locations.length} Results`}
                  subtitle={
                    showAllResults
                      ? "Collapse to show only top 4 results"
                      : `${locations.length - 4} more results available`
                  }
                  accessories={[{ text: "⌘⇧↵", tooltip: "Cmd+Shift+Enter" }]}
                  icon={showAllResults ? Icon.ChevronUp : Icon.ChevronDown}
                  actions={
                    <ActionPanel>
                      <Action
                        title={showAllResults ? "Show Less Results" : "Show All Results"}
                        icon={showAllResults ? Icon.ChevronUp : Icon.ChevronDown}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                        onAction={() => setShowAllResults(!showAllResults)}
                      />
                    </ActionPanel>
                  }
                />
              )}
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
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Open Forecast"
                        target={<ForecastView name={fav.name} lat={fav.lat} lon={fav.lon} />}
                      />
                      <Action
                        title="Show Current Weather"
                        onAction={async () => {
                          try {
                            const ts: TimeseriesEntry = await getWeather(fav.lat, fav.lon);
                            await showToast({
                              style: Toast.Style.Success,
                              title: `Now at ${fav.name}`,
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
                        target={<GraphView name={fav.name} lat={fav.lat} lon={fav.lon} />}
                      />
                      <Action
                        title="Remove from Favorites"
                        icon={Icon.StarDisabled}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                        onAction={async () => {
                          await removeFavorite(fav);
                          setFavorites(await getFavorites());
                          if (fav.id) setFavoriteIds((m) => ({ ...m, [fav.id as string]: false }));
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Removed from Favorites",
                            message: `${fav.name} has been removed from your favorites`,
                          });
                        }}
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
        tag: `🌅 ${sr.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })}`,
        tooltip: "Sunrise",
      });
    if (ss)
      acc.push({
        tag: `🌇 ${ss.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })}`,
        tooltip: "Sunset",
      });
  }
  return acc.length ? acc : undefined;
}
