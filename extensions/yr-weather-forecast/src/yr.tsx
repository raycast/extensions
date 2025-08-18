import { useEffect, useState } from "react";
import { Action, ActionPanel, List, showToast, Toast, Icon, Image } from "@raycast/api";
import { formatPrecip, formatTemperatureCelsius, formatWindSpeed, getUnits, getFeatureFlags } from "./units";
import ForecastView from "./forecast";
import GraphView from "./graph";
import { searchLocations, type LocationResult } from "./location-search";
import { getWeather, type TimeseriesEntry } from "./weather-client";
import { precipitationAmount, symbolCode } from "./utils-forecast";
import { addFavorite, isFavorite, removeFavorite, type FavoriteLocation, getFavorites } from "./storage";
import { getSunTimes, type SunTimes } from "./sunrise-client";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Record<string, boolean>>({});
  const [favoriteWeather, setFavoriteWeather] = useState<Record<string, TimeseriesEntry | undefined>>({});
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [sunTimes, setSunTimes] = useState<Record<string, SunTimes>>({});

  useEffect(() => {
    (async () => setFavorites(await getFavorites()))();
  }, []);

  useEffect(() => {
    if (favorites.length === 0) {
      setFavoriteWeather({});
      return;
    }
    let cancelled = false;
    async function fetchAll() {
      setLoadingFavorites(true);
      try {
        const entries = await Promise.all(
          favorites.map(async (fav) => {
            try {
              const ts = await getWeather(fav.lat, fav.lon);
              const key = fav.id ?? (`${fav.lat},${fav.lon}` as string);
              const sun = await getSunTimes(fav.lat, fav.lon).catch(() => ({}) as SunTimes);
              return [key, ts, sun] as const;
            } catch {
              const key = fav.id ?? (`${fav.lat},${fav.lon}` as string);
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
      } finally {
        if (!cancelled) setLoadingFavorites(false);
      }
    }
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [favorites]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const q = searchText.trim();
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
        await showFailureToast("Search failed", error);
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

  const showEmpty = favorites.length === 0 && locations.length === 0;

  return (
    <List
      isLoading={isLoading || loadingFavorites}
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
          {favorites.length > 0 && (
            <List.Section title="Favorites">
              {favorites.map((fav) => (
                <List.Item
                  key={fav.id ?? `${fav.lat},${fav.lon}`}
                  title={fav.name}
                  subtitle={formatTemp(favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`])}
                  icon={iconForSymbol(favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`])}
                  accessories={formatAccessories(
                    favoriteWeather[fav.id ?? `${fav.lat},${fav.lon}`],
                    sunTimes[fav.id ?? `${fav.lat},${fav.lon}`],
                  )}
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
                            await showFailureToast("Failed to load weather", error);
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
                        onAction={async () => {
                          await removeFavorite(fav);
                          setFavorites(await getFavorites());
                          if (fav.id) setFavoriteIds((m) => ({ ...m, [fav.id as string]: false }));
                          await showToast({ style: Toast.Style.Animated, title: "Removed from Favorites" });
                        }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          <List.Section title="Search Results">
            {locations.map((loc) => (
              <List.Item
                key={loc.id}
                title={loc.displayName}
                accessories={[{ text: `${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)}` }]}
                actions={
                  <ActionPanel>
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
                          await showFailureToast("Failed to load weather", error);
                        }
                      }}
                    />
                    {favoriteIds[loc.id] ? (
                      <Action
                        title="Remove from Favorites"
                        icon={Icon.StarDisabled}
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
                          await showToast({ style: Toast.Style.Animated, title: "Removed from Favorites" });
                        }}
                      />
                    ) : (
                      <Action
                        title="Add to Favorites"
                        icon={Icon.Star}
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
                          await showToast({ style: Toast.Style.Success, title: "Added to Favorites" });
                        }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
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

function formatTemp(ts: TimeseriesEntry | undefined): string | undefined {
  const details = ts?.data?.instant?.details ?? {};
  return formatTemperatureCelsius(details.air_temperature);
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

function iconForSymbol(ts: TimeseriesEntry | undefined): Image.ImageLike | undefined {
  const symbol = symbolCode(ts);
  if (!symbol) return undefined;
  const s = symbol.toLowerCase();
  if (s.includes("thunder")) return "⛈️";
  if (s.includes("sleet")) return "🌨️";
  if (s.includes("snow")) return "🌨️";
  if (s.includes("rain")) return s.includes("showers") ? "🌦️" : "🌧️";
  if (s.includes("fog")) return "🌫️";
  if (s.includes("partlycloudy")) return "🌤️";
  if (s.includes("cloudy")) return "☁️";
  if (s.includes("fair")) return s.includes("night") ? "🌙" : "🌤️";
  if (s.includes("clearsky")) return s.includes("night") ? "🌙" : "☀️";
  return "🌡️";
}

function directionFromDegrees(degrees: number): { arrow: string; name: string } {
  // Normalize degrees to [0, 360)
  const d = ((degrees % 360) + 360) % 360;
  const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"] as const;
  // 8 sectors of 45°, centered on the compass points
  const index = Math.round(d / 45) % 8;
  return { arrow: arrows[index], name: names[index] };
}
