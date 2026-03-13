import { Action, ActionPanel, Detail, showToast, Toast, Icon } from "@raycast/api";
import { useMemo, useState, useEffect } from "react";
import { buildGraphMarkdown } from "./graph";
import { reduceToDayPeriods, buildWeatherTable, filterToDate } from "./weather-utils";
import { useWeatherData } from "./hooks/useWeatherData";
import { generateNoForecastDataMessage } from "./utils/error-messages";
import { addFavorite, removeFavorite, isFavorite as checkIsFavorite, type FavoriteLocation } from "./storage";
import { withErrorBoundary } from "./components/error-boundary";
import { WeatherErrorFallback } from "./components/error-fallbacks";
import { getUIThresholds } from "./config/weather-config";
import { formatDate } from "./utils/date-utils";
import { FavoriteToggleAction } from "./components/FavoriteToggleAction";

function ForecastView(props: {
  name: string;
  lat: number;
  lon: number;
  preCachedGraph?: string;
  onShowWelcome?: () => void;
  targetDate?: string; // ISO date string for specific day view
}) {
  const { name, lat, lon, preCachedGraph, onShowWelcome, targetDate } = props;
  const [mode, setMode] = useState<"detailed" | "summary">("detailed");
  const [view, setView] = useState<"graph" | "data">("graph");
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const { series: items, loading, showNoData, preRenderedGraph } = useWeatherData(lat, lon, true);

  // Check if current location is in favorites
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const favLocation: FavoriteLocation = { name, lat, lon };
      const favorite = await checkIsFavorite(favLocation);
      setIsFavorite(favorite);
    };
    checkFavoriteStatus();
  }, [name, lat, lon]);

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
      // Use pre-cached graph if available, otherwise use pre-rendered graph, otherwise generate new one
      const detailedGraph =
        preCachedGraph ||
        preRenderedGraph ||
        buildGraphMarkdown(
          name,
          items.slice(0, getUIThresholds().DETAILED_FORECAST_HOURS),
          getUIThresholds().DETAILED_FORECAST_HOURS,
          {
            title: "48h forecast",
            smooth: true,
          },
        ).markdown;

      // Cache summary graph (9-day)
      const summaryGraph = buildGraphMarkdown(name, reduced, reduced.length, {
        title: "9-day summary",
        smooth: true,
      }).markdown;

      setGraphCache({
        detailed: detailedGraph,
        summary: summaryGraph,
      });
    }
  }, [items, reduced, name, preCachedGraph, preRenderedGraph]);

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
        return [titleText, content].join("\n");
      })()
    : "";

  const handleFavoriteToggle = async () => {
    const favLocation: FavoriteLocation = { name, lat, lon };

    try {
      if (isFavorite) {
        await removeFavorite(favLocation);
        setIsFavorite(false);
        await showToast({
          style: Toast.Style.Success,
          title: "Removed from Favorites",
          message: `${name} has been removed from your favorites`,
        });
      } else {
        await addFavorite(favLocation);
        setIsFavorite(true);
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
