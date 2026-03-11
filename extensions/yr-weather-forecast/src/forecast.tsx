import { Action, ActionPanel, Detail, showToast, Toast, Icon } from "@raycast/api";
import { useMemo, useState, useEffect } from "react";
import { buildGraphMarkdown } from "./graph-utils";
import { reduceToDayPeriods, buildWeatherTable, filterToDate } from "./weather-utils";
import { useWeatherData } from "./hooks/useWeatherData";
import { generateNoForecastDataMessage } from "./utils/error-messages";
import {
  addFavorite,
  removeFavorite,
  getFavorites,
  isFavorite as isFavoriteLocation,
  type FavoriteLocation,
} from "./storage";
import { FavoriteToggleAction } from "./components/FavoriteToggleAction";
import { UI_THRESHOLDS } from "./config/weather-config";
import { formatDate, parseLocalDateString, toLocalDateString } from "./utils/date-utils";
import { buildCompactWeatherSummary } from "./utils/weather-summary-builder";
import { getSunTimes, type SunTimes } from "./sunrise-client";
import { generateAndCacheGraph } from "./graph-cache";
import { LocationUtils } from "./utils/location-utils";
import { clearAllCached } from "./cache";
import { DebugLogger } from "./utils/debug-utils";
import { LocationResult } from "./location-search";

type ForecastLocationInput =
  | {
      location: LocationResult;
      locationId?: string;
      name?: never;
      lat?: never;
      lon?: never;
    }
  | {
      location?: undefined;
      locationId?: string;
      name: string;
      lat: number;
      lon: number;
    };

export type ForecastViewProps = ForecastLocationInput & {
  preCachedGraph?: string;
  onShowWelcome?: () => void;
  targetDate?: string; // ISO date string for specific day view
  onFavoriteChange?: () => void; // Callback when favorites are added/removed
  initialMode?: "detailed" | "summary"; // Initial mode to start in
};

type ResolvedForecastLocation = {
  key: string;
  displayName: string;
  lat: number;
  lon: number;
  locationData: LocationResult;
};

function resolveForecastLocation(input: ForecastLocationInput): ResolvedForecastLocation {
  if (input.location) {
    const source = input.location;
    const key = LocationUtils.getLocationKey(input.locationId ?? source.id, source.lat, source.lon);
    return {
      key,
      displayName: source.displayName,
      lat: source.lat,
      lon: source.lon,
      locationData: { ...source, id: key },
    };
  }

  const key = LocationUtils.getLocationKey(input.locationId, input.lat, input.lon);
  return {
    key,
    displayName: input.name,
    lat: input.lat,
    lon: input.lon,
    locationData: {
      id: key,
      displayName: input.name,
      lat: input.lat,
      lon: input.lon,
      address: undefined,
      addresstype: undefined,
      type: undefined,
      class: undefined,
    },
  };
}

function ForecastView(props: ForecastViewProps) {
  const { preCachedGraph, onShowWelcome, targetDate, onFavoriteChange, initialMode } = props;
  const resolvedLocation = resolveForecastLocation(props);
  const canonicalKey = resolvedLocation.key;
  const originalName = resolvedLocation.displayName;
  const { lat, lon, locationData } = resolvedLocation;

  const [mode, setMode] = useState<"detailed" | "summary">(initialMode || "detailed");
  const [view, setView] = useState<"graph" | "data">("graph");
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [sunByDate, setSunByDate] = useState<Record<string, SunTimes>>({});
  const [sunDataReady, setSunDataReady] = useState<boolean>(false);
  const {
    series: items,
    loading,
    showNoData,
    preRenderedGraph,
    metadata,
    refresh: refreshWeatherData,
  } = useWeatherData(lat, lon, true);

  // Check if current location is in favorites using canonical identity.
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const favLike: FavoriteLocation = { id: canonicalKey, name: originalName, lat, lon };
      const isFav = await isFavoriteLocation(favLike);
      setIsFavorite(isFav);
    };
    checkFavoriteStatus();
  }, [canonicalKey, lat, lon, originalName]);

  // Fetch sunrise/sunset for visible dates once forecast is loaded
  useEffect(() => {
    setSunDataReady(false);
    let cancelled = false;

    const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          promise,
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(`Timeout: ${label}`)), timeoutMs);
          }),
        ]);
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    async function fetchSun() {
      if (items.length === 0) return;

      // For target date (1-day view), fetch sunrise/sunset for that specific date
      // For detailed mode (48h), fetch for the first 48 hours
      let dates: string[];
      if (targetDate) {
        dates = [targetDate];
        DebugLogger.debug(`Fetching sunrise/sunset for target date:`, dates);
      } else {
        const subset = items.slice(0, UI_THRESHOLDS.DETAILED_FORECAST_HOURS);
        dates = Array.from(new Set(subset.map((s) => new Date(s.time)).map((d) => toLocalDateString(d))));
        DebugLogger.debug(`Forecast dates for sunrise/sunset:`, dates);
      }

      const entries = await Promise.allSettled(
        dates.map(async (date: string) => {
          DebugLogger.debug(`Fetching sunrise/sunset for ${date} at ${lat}, ${lon}`);
          const value = await withTimeout(getSunTimes(lat, lon, date), 5000, `sunrise/sunset for ${date}`);
          return [date, value] as const;
        }),
      );

      if (!cancelled) {
        const map: Record<string, SunTimes> = {};
        let successCount = 0;
        let errorCount = 0;

        for (let index = 0; index < entries.length; index++) {
          const entry = entries[index];
          const date = dates[index];

          if (entry.status === "fulfilled") {
            const [entryDate, sunTimes] = entry.value as [string, SunTimes];
            map[entryDate] = sunTimes;
            if (sunTimes && (sunTimes.sunrise || sunTimes.sunset)) {
              successCount++;
            } else {
              errorCount++;
            }
          } else {
            DebugLogger.warn(`Failed to fetch sunrise/sunset for ${date}:`, entry.reason);
            map[date] = {};
            errorCount++;
          }
        }

        // Log summary of sunrise/sunset data fetch
        DebugLogger.debug(`sunByDate data fetched for location: ${successCount} successful, ${errorCount} failed`, map);

        // Always set the data, even if some requests failed
        // This ensures graph generation proceeds with partial data
        setSunByDate(map);
        setSunDataReady(true);

        // Show user feedback if there were issues (but don't block the UI)
        if (errorCount > 0 && successCount === 0) {
          DebugLogger.warn(
            `⚠️ All sunrise/sunset requests failed for ${originalName}. Graph will render without sunrise/sunset indicators.`,
          );
        } else if (errorCount > 0) {
          DebugLogger.warn(
            `⚠️ Partial sunrise/sunset data for ${originalName}: ${successCount}/${dates.length} successful. Some indicators may be missing.`,
          );
        }
      }
    }
    fetchSun();
    return () => {
      cancelled = true;
    };
  }, [items, lat, lon, targetDate]);

  // Filter data based on targetDate if provided, otherwise use mode-based filtering
  const filteredItems = useMemo(() => {
    if (targetDate) {
      return filterToDate(items, parseLocalDateString(targetDate));
    }
    return items;
  }, [items, targetDate]);

  const reduced = useMemo(() => reduceToDayPeriods(items, UI_THRESHOLDS.SUMMARY_FORECAST_DAYS), [items]);
  const displaySeries = useMemo(() => {
    if (targetDate) {
      return filteredItems; // Use filtered data for specific date
    }
    return mode === "detailed" ? items.slice(0, UI_THRESHOLDS.DETAILED_FORECAST_HOURS) : reduced;
  }, [targetDate, filteredItems, mode, items, reduced]);

  // Cache both graph types for instant switching
  const [graphCache, setGraphCache] = useState<{
    detailed?: string;
    summary?: string;
  }>({});

  // Generate and cache graphs when data changes
  useEffect(() => {
    DebugLogger.debug(
      "Graph generation triggered with items.length:",
      items.length,
      "sunByDate keys:",
      Object.keys(sunByDate).length,
    );

    // Generate graphs if we have weather data.
    // We rely on graph input data (including sunByDate) as the cache discriminator
    // instead of imperative cache clearing effects.
    if (items.length > 0 && sunDataReady) {
      const locationKey = canonicalKey;

      // Use displaySeries for graph generation to respect target date filtering
      const dataForDetailedGraph = targetDate ? displaySeries : items.slice(0, UI_THRESHOLDS.DETAILED_FORECAST_HOURS);
      const dataForSummaryGraph = targetDate ? displaySeries : reduced;

      // Generate graphs using persistent cache
      const generateGraphs = async () => {
        try {
          const [detailedGraph, summaryGraph] = await Promise.all([
            generateAndCacheGraph(
              locationKey,
              "detailed",
              dataForDetailedGraph,
              originalName,
              targetDate ? displaySeries.length : UI_THRESHOLDS.DETAILED_FORECAST_HOURS,
              sunByDate,
              targetDate,
            ),
            generateAndCacheGraph(
              locationKey,
              "summary",
              dataForSummaryGraph,
              originalName,
              dataForSummaryGraph.length,
              targetDate ? sunByDate : undefined, // Show sunrise/sunset for 1-day, not for 9-day summary
              targetDate,
            ),
          ]);

          setGraphCache({
            detailed: detailedGraph,
            summary: summaryGraph,
          });
        } catch (error) {
          DebugLogger.warn("Failed to generate cached graphs, falling back to direct generation:", error);

          // Fallback to direct generation if caching fails
          const detailedGraph = buildGraphMarkdown(
            originalName,
            dataForDetailedGraph,
            targetDate ? displaySeries.length : UI_THRESHOLDS.DETAILED_FORECAST_HOURS,
            {
              title: targetDate ? "1-day forecast" : "48h forecast",
              smooth: true,
              sunByDate,
            },
          ).markdown;

          const summaryGraph = buildGraphMarkdown(originalName, dataForSummaryGraph, dataForSummaryGraph.length, {
            title: targetDate ? "1-day forecast" : "9-day summary",
            smooth: true,
            sunByDate: targetDate ? sunByDate : undefined, // Show sunrise/sunset for 1-day, not for 9-day summary
          }).markdown;

          setGraphCache({
            detailed: detailedGraph,
            summary: summaryGraph,
          });
        }
      };

      generateGraphs();
    }
  }, [
    canonicalKey,
    items,
    reduced,
    originalName,
    preCachedGraph,
    preRenderedGraph,
    sunByDate,
    sunDataReady,
    displaySeries,
    targetDate,
    lat,
    lon,
  ]);

  // Get cached graph based on current mode, with preCachedGraph as fallback
  const graph = useMemo(() => {
    if (displaySeries.length === 0 && showNoData) return "";

    // Use preCachedGraph if available and we don't have a cached version yet
    if (preCachedGraph && !graphCache[mode]) {
      return preCachedGraph;
    }

    return mode === "detailed" ? graphCache.detailed : graphCache.summary;
  }, [mode, graphCache, displaySeries.length, showNoData, preCachedGraph]);

  const listMarkdown = useMemo(() => {
    if (displaySeries.length === 0 && showNoData) {
      return generateNoForecastDataMessage({ locationName: originalName });
    }

    // For data view, show table with filtered data (respects target date)
    return buildWeatherTable(displaySeries, { showDirection: true, showPeriod: false });
  }, [displaySeries, showNoData, originalName]);

  // Only show content when not loading and we have data or know there's no data
  const shouldShowContent = !loading && (displaySeries.length > 0 || showNoData);

  // Generate content based on current view and mode
  const finalMarkdown = shouldShowContent
    ? (() => {
        let titleText;
        const simplifiedName = LocationUtils.formatLocationName(locationData);
        const locationEmoji = LocationUtils.getLocationEmoji(locationData);

        if (targetDate) {
          const dateLabel = formatDate(parseLocalDateString(targetDate), "LONG_DAY");
          DebugLogger.debug(`Date display: targetDate="${targetDate}", dateLabel="${dateLabel}"`);
          titleText = `# ${locationEmoji} ${simplifiedName} – ${dateLabel} (1-day)${view === "data" ? " (Data)" : ""}`;
        } else {
          titleText = `# ${locationEmoji} ${simplifiedName} – ${mode === "detailed" ? "48-Hour Forecast" : "9-Day Summary"}${view === "data" ? " (Data)" : ""}`;
        }
        const content = view === "graph" ? graph : listMarkdown;

        // Add temperature, precipitation, and sunrise/sunset summary for both detailed and summary forecasts
        let summaryInfo = "";
        if (mode === "detailed" || mode === "summary") {
          // Build compact weather summary using the reusable utility (includes data coverage)
          const compactSummary = buildCompactWeatherSummary(displaySeries, sunByDate, metadata, {}, targetDate);
          if (compactSummary) {
            summaryInfo = `\n\n${compactSummary}`;
          }
        }

        return [titleText, summaryInfo, content].join("\n");
      })()
    : "";

  // Handle refresh with cache clear
  const handleRefreshWithCacheClear = async () => {
    try {
      // Clear graph cache
      setGraphCache({ detailed: "", summary: "" });

      // Clear persistent cache
      await clearAllCached();

      // Force reload weather data
      refreshWeatherData();
      setSunByDate({});
      setSunDataReady(false);

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

  const handleFavoriteToggle = async () => {
    const id = canonicalKey;
    const favLocation: FavoriteLocation = { id, name: originalName, lat, lon };

    try {
      if (isFavorite) {
        await removeFavorite(favLocation);
        setIsFavorite(false);
        onFavoriteChange?.(); // Notify parent component
        await showToast({
          style: Toast.Style.Success,
          title: "Removed from Favorites",
          message: `${originalName} has been removed from your favorites`,
        });
      } else {
        // Check if there's already a favorite with the same location
        const existingFavorites = await getFavorites();
        const existingFavorite = existingFavorites.find((fav) => fav.id === id);

        if (existingFavorite) {
          // Update the existing favorite's name to the current name
          if (existingFavorite.name !== originalName) {
            await removeFavorite(existingFavorite);
            const updatedFavorite: FavoriteLocation = {
              ...existingFavorite,
              name: originalName,
              id,
            };
            await addFavorite(updatedFavorite);
            await showToast({
              style: Toast.Style.Success,
              title: "Updated Favorite",
              message: `Updated existing favorite to "${originalName}"`,
            });
          } else {
            await showToast({
              style: Toast.Style.Animated,
              title: "⭐ Already a Favorite Location!",
              message: `${originalName} is already in your favorites`,
            });
            return; // Don't update isFavorite state or call onFavoriteChange
          }
        } else {
          // Add new favorite (storage layer will prevent duplicates)
          const wasAdded = await addFavorite(favLocation);
          if (wasAdded) {
            await showToast({
              style: Toast.Style.Success,
              title: "Added to Favorites",
              message: `${originalName} has been added to your favorites`,
            });
          } else {
            await showToast({
              style: Toast.Style.Animated,
              title: "⭐ Already a Favorite Location!",
              message: `${originalName} is already in your favorites`,
            });
            return; // Don't update isFavorite state or call onFavoriteChange
          }
        }

        setIsFavorite(true);
        onFavoriteChange?.(); // Notify parent component
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update favorites",
        message: String(error),
      });
    }
  };

  return (
    <Detail
      isLoading={loading}
      markdown={finalMarkdown}
      actions={
        <ActionPanel>
          {/* Mode switching actions with dedicated shortcuts */}
          {targetDate ? (
            <>
              <Action.Push
                title="Show 48-Hour Detailed"
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd"], key: "4" }}
                target={
                  <ForecastView
                    location={locationData}
                    onShowWelcome={onShowWelcome}
                    onFavoriteChange={onFavoriteChange}
                    initialMode="detailed"
                  />
                }
              />
              <Action.Push
                title="Show 9-Day Summary"
                icon={Icon.Calendar}
                shortcut={{ modifiers: ["cmd"], key: "9" }}
                target={
                  <ForecastView
                    location={locationData}
                    onShowWelcome={onShowWelcome}
                    onFavoriteChange={onFavoriteChange}
                    initialMode="summary"
                  />
                }
              />
            </>
          ) : (
            <>
              {mode === "detailed" ? (
                <Action title="Show 9-Day Summary" icon={Icon.Calendar} onAction={() => setMode("summary")} />
              ) : (
                <Action title="Show 48-Hour Detailed" icon={Icon.Clock} onAction={() => setMode("detailed")} />
              )}
              <Action
                title={mode === "detailed" ? "Show 9-Day Summary" : "Show 48-Hour Detailed"}
                icon={mode === "detailed" ? Icon.Calendar : Icon.Clock}
                shortcut={{ modifiers: ["cmd"], key: mode === "detailed" ? "9" : "4" }}
                onAction={() => setMode(mode === "detailed" ? "summary" : "detailed")}
              />
            </>
          )}

          {/* View switching actions */}
          {view === "graph" ? (
            <Action
              title="Show Data Table"
              icon={Icon.List}
              shortcut={{ modifiers: [], key: "d" }}
              onAction={() => setView("data")}
            />
          ) : (
            <Action
              title="Show Graph"
              icon={Icon.BarChart}
              shortcut={{ modifiers: [], key: "g" }}
              onAction={() => setView("graph")}
            />
          )}

          <Action
            title="Refresh & Clear Cache"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={handleRefreshWithCacheClear}
          />

          <FavoriteToggleAction isFavorite={isFavorite} onToggle={handleFavoriteToggle} />

          {onShowWelcome && (
            <Action
              title="Show Welcome Message"
              icon={Icon.Info}
              onAction={onShowWelcome}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export default ForecastView;
