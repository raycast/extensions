import { Action, ActionPanel, Detail, showToast, Toast, Icon } from "@raycast/api";
import { useMemo, useState, useEffect } from "react";
import { type TimeseriesEntry } from "./weather-client";
import { buildGraphMarkdown } from "./graph";
import { groupByDay, reduceToDayPeriods, buildWeatherTable } from "./weather-utils";
import { useWeatherData } from "./hooks/useWeatherData";
import { generateNoForecastDataMessage } from "./utils/error-messages";
import { addFavorite, removeFavorite, isFavorite as checkIsFavorite, type FavoriteLocation } from "./storage";
import { withErrorBoundary } from "./components/error-boundary";
import { WeatherErrorFallback } from "./components/error-fallbacks";
import { getUIThresholds } from "./config/weather-config";

function ForecastView(props: {
  name: string;
  lat: number;
  lon: number;
  preCachedGraph?: string;
  onShowWelcome?: () => void;
}) {
  const { name, lat, lon, preCachedGraph, onShowWelcome } = props;
  const [mode, setMode] = useState<"detailed" | "summary">("detailed");
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const { series: items, loading, showNoData } = useWeatherData(lat, lon);

  // Check if current location is in favorites
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const favLocation: FavoriteLocation = { name, lat, lon };
      const favorite = await checkIsFavorite(favLocation);
      setIsFavorite(favorite);
    };
    checkFavoriteStatus();
  }, [name, lat, lon]);

  const byDay = useMemo(() => groupByDay(items), [items]);
  const reduced = useMemo(() => reduceToDayPeriods(items, getUIThresholds().SUMMARY_FORECAST_DAYS), [items]);
  const displaySeries = mode === "detailed" ? items.slice(0, getUIThresholds().DETAILED_FORECAST_HOURS) : reduced;

  // Cache both graph types for instant switching
  const [graphCache, setGraphCache] = useState<{
    detailed?: string;
    summary?: string;
  }>({});

  // Generate and cache graphs when data changes
  useEffect(() => {
    if (items.length > 0) {
      // Use pre-cached graph if available, otherwise generate new one
      const detailedGraph =
        preCachedGraph ||
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
  }, [items, reduced, name, preCachedGraph]);

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
    if (displaySeries.length === 0 && showNoData) {
      return generateNoForecastDataMessage({ locationName: name });
    }

    return mode === "detailed" ? buildListMarkdown(byDay) : buildSummaryListMarkdown(reduced);
  }, [mode, byDay, reduced, displaySeries.length, showNoData, name]);

  // Only show content when not loading and we have data or know there's no data
  const shouldShowContent = !loading && (displaySeries.length > 0 || showNoData);

  // Wait for graph to actually render before showing content to prevent visual jumping
  const [graphRendered, setGraphRendered] = useState(false);

  // Show content only when graph is fully rendered
  const finalMarkdown = shouldShowContent && graphRendered ? [graph, "\n---\n", listMarkdown].join("\n") : "";

  // Reset graphRendered immediately when mode changes to prevent flickering
  useEffect(() => {
    setGraphRendered(false);
  }, [mode]);

  // Detect when graph is actually rendered to prevent visual jumping
  useEffect(() => {
    if (shouldShowContent && graph) {
      // Check if graph is already cached - if so, show immediately
      const isGraphCached = mode === "detailed" ? !!graphCache.detailed : !!graphCache.summary;

      if (isGraphCached) {
        // Graph is cached, show immediately
        setGraphRendered(true);
      } else {
        // Graph needs to be generated, apply delay for rendering
        const timer = setTimeout(() => {
          setGraphRendered(true);
        }, 200); // Delay for markdown parsing + SVG rendering + layout calculation

        return () => clearTimeout(timer);
      }
    } else {
      setGraphRendered(false);
    }
  }, [shouldShowContent, graph, mode, graphCache]);

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
          {mode === "detailed" ? (
            <Action title="Show 9-Day Summary" onAction={() => setMode("summary")} />
          ) : (
            <Action title="Show 2-Day Detailed" onAction={() => setMode("detailed")} />
          )}
          {isFavorite ? (
            <Action
              title="Remove from Favorites"
              icon={Icon.StarDisabled}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={handleFavoriteToggle}
            />
          ) : (
            <Action
              title="Add to Favorites"
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={handleFavoriteToggle}
            />
          )}

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

function buildListMarkdown(byDay: Record<string, TimeseriesEntry[]>): string {
  const sections: string[] = [];
  for (const [day, entries] of Object.entries(byDay)) {
    sections.push(`### ${day}`);
    sections.push("");
    sections.push(buildWeatherTable(entries, { showDirection: true }));
  }
  return sections.join("\n");
}

function buildSummaryListMarkdown(series: TimeseriesEntry[]): string {
  // Group reduced series again by day for table rendering
  const byDay = groupByDay(series);
  const sections: string[] = [];
  for (const [day, entries] of Object.entries(byDay)) {
    // Sort by time
    entries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    sections.push(`### ${day}`);
    sections.push("");
    sections.push(buildWeatherTable(entries, { showDirection: true, showPeriod: true }));
  }
  return sections.join("\n");
}
