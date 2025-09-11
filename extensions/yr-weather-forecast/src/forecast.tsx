import { Action, ActionPanel, Detail, showToast, Toast, Icon } from "@raycast/api";
import { useMemo, useState, useEffect } from "react";
import { buildGraphMarkdown } from "./graph-utils";
import { reduceToDayPeriods, buildWeatherTable, filterToDate } from "./weather-utils";
import { useWeatherData } from "./hooks/useWeatherData";
import { generateNoForecastDataMessage } from "./utils/error-messages";
import { addFavorite, removeFavorite, isFavorite as checkIsFavorite, type FavoriteLocation } from "./storage";
import { withErrorBoundary } from "./components/error-boundary";
import { WeatherErrorFallback } from "./components/error-fallbacks";
import { getUIThresholds } from "./config/weather-config";
import { formatDate, formatTime } from "./utils/date-utils";
import { getSunTimes, type SunTimes } from "./sunrise-client";
import { formatTemperatureCelsius, formatPrecip } from "./units";
import { precipitationAmount } from "./utils-forecast";

function ForecastView(props: {
  name: string;
  lat: number;
  lon: number;
  preCachedGraph?: string;
  onShowWelcome?: () => void;
  targetDate?: string; // ISO date string for specific day view
  onFavoriteChange?: () => void; // Callback when favorites are added/removed
}) {
  const { name, lat, lon, preCachedGraph, onShowWelcome, targetDate, onFavoriteChange } = props;
  const [mode, setMode] = useState<"detailed" | "summary">("detailed");
  const [view, setView] = useState<"graph" | "data">("graph");
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [sunByDate, setSunByDate] = useState<Record<string, SunTimes>>({});
  const { series: items, loading, showNoData, preRenderedGraph } = useWeatherData(lat, lon, true);

  // Check if current location is in favorites
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      // Generate a consistent ID for locations that don't have one from search results
      const id = `${lat.toFixed(3)},${lon.toFixed(3)}`;
      const favLocation: FavoriteLocation = { id, name, lat, lon };
      const favorite = await checkIsFavorite(favLocation);
      setIsFavorite(favorite);
    };
    checkFavoriteStatus();
  }, [name, lat, lon]);

  // Fetch sunrise/sunset for visible dates once forecast is loaded
  useEffect(() => {
    let cancelled = false;
    async function fetchSun() {
      if (items.length === 0) return;
      const subset = items.slice(0, getUIThresholds().DETAILED_FORECAST_HOURS);
      const dates = Array.from(new Set(subset.map((s) => new Date(s.time)).map((d) => d.toISOString().slice(0, 10))));
      const entries = await Promise.all(
        dates.map(async (date: string) => {
          try {
            const v = await getSunTimes(lat, lon, date);
            return [date, v] as const;
          } catch (error) {
            console.warn(`Failed to fetch sunrise/sunset for ${date}:`, error);
            return [date, {} as SunTimes];
          }
        }),
      );
      if (!cancelled) {
        const map: Record<string, SunTimes> = {};
        for (const entry of entries) {
          const [date, sunTimes] = entry as [string, SunTimes];
          map[date] = sunTimes;
        }
        setSunByDate(map);
      }
    }
    fetchSun();
    return () => {
      cancelled = true;
    };
  }, [items, lat, lon]);

  // Filter data based on targetDate if provided, otherwise use mode-based filtering
  const filteredItems = useMemo(() => {
    if (targetDate) {
      return filterToDate(items, new Date(targetDate));
    }
    return items;
  }, [items, targetDate]);

  const reduced = useMemo(() => reduceToDayPeriods(items, getUIThresholds().SUMMARY_FORECAST_DAYS), [items]);
  const displaySeries = useMemo(() => {
    if (targetDate) {
      return filteredItems; // Use filtered data for specific date
    }
    return mode === "detailed" ? items.slice(0, getUIThresholds().DETAILED_FORECAST_HOURS) : reduced;
  }, [targetDate, filteredItems, mode, items, reduced]);

  // Cache both graph types for instant switching
  const [graphCache, setGraphCache] = useState<{
    detailed?: string;
    summary?: string;
  }>({});

  // Generate and cache graphs when data changes
  useEffect(() => {
    if (items.length > 0) {
      // Always generate fresh graph to include sunrise/sunset data
      const detailedGraph = buildGraphMarkdown(
        name,
        items.slice(0, getUIThresholds().DETAILED_FORECAST_HOURS),
        getUIThresholds().DETAILED_FORECAST_HOURS,
        {
          title: "48h forecast",
          smooth: true,
          sunByDate,
        },
      ).markdown;

      // Cache summary graph (9-day) - no sunrise/sunset data needed
      const summaryGraph = buildGraphMarkdown(name, reduced, reduced.length, {
        title: "9-day summary",
        smooth: true,
      }).markdown;

      setGraphCache({
        detailed: detailedGraph,
        summary: summaryGraph,
      });
    }
  }, [items, reduced, name, preCachedGraph, preRenderedGraph, sunByDate]);

  // Clear graph cache when component mounts to ensure fresh styling
  useEffect(() => {
    setGraphCache({ detailed: "", summary: "" });
  }, []);

  // Get cached graph based on current mode
  const graph = useMemo(() => {
    if (displaySeries.length === 0 && showNoData) return "";
    return mode === "detailed" ? graphCache.detailed : graphCache.summary;
  }, [mode, graphCache, displaySeries.length, showNoData]);

  const listMarkdown = useMemo(() => {
    if (items.length === 0 && showNoData) {
      return generateNoForecastDataMessage({ locationName: name });
    }

    // For data view, always show comprehensive table with all data points
    return buildWeatherTable(items, { showDirection: true, showPeriod: false });
  }, [items, showNoData, name]);

  // Only show content when not loading and we have data or know there's no data
  const shouldShowContent = !loading && (displaySeries.length > 0 || showNoData);

  // Generate content based on current view and mode
  const finalMarkdown = shouldShowContent
    ? (() => {
        let titleText;
        if (targetDate) {
          const dateLabel = formatDate(targetDate, "LONG_DAY");
          titleText = `# ${name} – ${dateLabel} (1-day)${view === "data" ? " (Data)" : ""}`;
        } else {
          titleText = `# ${name} – ${mode === "detailed" ? "48-Hour Forecast" : "9-Day Summary"}${view === "data" ? " (Data)" : ""}`;
        }
        const content = view === "graph" ? graph : listMarkdown;

        // Add temperature, precipitation, and sunrise/sunset summary for detailed forecast
        let summaryInfo = "";
        if (mode === "detailed") {
          const summaryParts: string[] = [];

          // Temperature range
          if (items.length > 0) {
            const temps = items
              .slice(0, getUIThresholds().DETAILED_FORECAST_HOURS)
              .map((s) => s.data?.instant?.details?.air_temperature)
              .filter((t): t is number => typeof t === "number" && Number.isFinite(t));

            if (temps.length > 0) {
              const minTemp = Math.min(...temps);
              const maxTemp = Math.max(...temps);
              const minText = formatTemperatureCelsius(minTemp);
              const maxText = formatTemperatureCelsius(maxTemp);
              summaryParts.push(`Min ${minText} • Max ${maxText}`);
            }
          }

          // Precipitation
          if (items.length > 0) {
            const precips = items
              .slice(0, getUIThresholds().DETAILED_FORECAST_HOURS)
              .map((s) => precipitationAmount(s))
              .filter((p): p is number => typeof p === "number" && Number.isFinite(p));

            if (precips.length > 0) {
              const maxPrecip = Math.max(...precips);
              const precipText = formatPrecip(maxPrecip);
              summaryParts.push(`Max precip ${precipText}`);
            }
          }

          // Sunrise/sunset
          if (Object.keys(sunByDate).length > 0) {
            const firstDate = Object.keys(sunByDate)[0];
            const sunTimes = sunByDate[firstDate];
            if (sunTimes.sunrise || sunTimes.sunset) {
              const sunriseTime = sunTimes.sunrise ? formatTime(sunTimes.sunrise, "MILITARY") : "N/A";
              const sunsetTime = sunTimes.sunset ? formatTime(sunTimes.sunset, "MILITARY") : "N/A";
              summaryParts.push(`Sunrise ${sunriseTime} • Sunset ${sunsetTime}`);
            }
          }

          if (summaryParts.length > 0) {
            summaryInfo = `\n\n${summaryParts.join(" • ")}`;
          }
        }

        return [titleText, summaryInfo, content].join("\n");
      })()
    : "";

  const handleFavoriteToggle = async () => {
    // Generate a consistent ID for locations that don't have one from search results
    const id = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    const favLocation: FavoriteLocation = { id, name, lat, lon };

    console.log("Adding favorite:", favLocation);

    try {
      if (isFavorite) {
        await removeFavorite(favLocation);
        setIsFavorite(false);
        onFavoriteChange?.(); // Notify parent component
        await showToast({
          style: Toast.Style.Success,
          title: "Removed from Favorites",
          message: `${name} has been removed from your favorites`,
        });
      } else {
        await addFavorite(favLocation);
        setIsFavorite(true);
        console.log("Favorite added successfully:", favLocation);
        onFavoriteChange?.(); // Notify parent component
        await showToast({
          style: Toast.Style.Success,
          title: "Added to Favorites",
          message: `${name} has been added to your favorites`,
        });
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
          {/* Primary flow: Mode switching with Space key (only when not in targetDate mode) */}
          {!targetDate && (
            <>
              {mode === "detailed" ? (
                <Action
                  title="Show 9-Day Summary"
                  icon={Icon.Calendar}
                  shortcut={{ modifiers: [], key: "space" }}
                  onAction={() => setMode("summary")}
                />
              ) : (
                <Action
                  title="Show 48-Hour Detailed"
                  icon={Icon.Clock}
                  shortcut={{ modifiers: [], key: "space" }}
                  onAction={() => setMode("detailed")}
                />
              )}
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

// Export with error boundary
export default withErrorBoundary(ForecastView, {
  componentName: "Forecast View",
  fallback: <WeatherErrorFallback componentName="Forecast View" />,
});
