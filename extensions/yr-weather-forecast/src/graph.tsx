import { Detail, Action, ActionPanel, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getSunTimes, type SunTimes } from "./sunrise-client";
import { buildWeatherTable } from "./weather-utils";
import { buildGraphMarkdown } from "./graph-utils";
import { useWeatherData } from "./hooks/useWeatherData";
import { generateNoForecastDataMessage } from "./utils/error-messages";
import { addFavorite, removeFavorite, isFavorite as checkIsFavorite, type FavoriteLocation } from "./storage";
import { withErrorBoundary } from "./components/error-boundary";
import { GraphErrorFallback } from "./components/error-fallbacks";
import { FavoriteToggleAction } from "./components/FavoriteToggleAction";
import { UI_THRESHOLDS } from "./config/weather-config";

function GraphView(props: {
  name: string;
  lat: number;
  lon: number;
  hours?: number;
  onShowWelcome?: () => void;
  preCachedGraph?: string;
  preWarmedGraph?: string;
}) {
  const {
    name,
    lat,
    lon,
    hours = UI_THRESHOLDS.DEFAULT_FORECAST_HOURS,
    onShowWelcome,
    preCachedGraph,
    preWarmedGraph,
  } = props;
  const [sunByDate, setSunByDate] = useState<Record<string, SunTimes>>({});
  const [view, setView] = useState<"graph" | "data">("graph");
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const { series, loading, showNoData, preRenderedGraph } = useWeatherData(lat, lon, true);

  // Check if current location is in favorites
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const favLocation: FavoriteLocation = { name, lat, lon };
      const favorite = await checkIsFavorite(favLocation);
      setIsFavorite(favorite);
    };
    checkFavoriteStatus();
  }, [name, lat, lon]);

  // Fetch sunrise/sunset for visible dates once forecast is loaded
  useEffect(() => {
    let cancelled = false;
    async function fetchSun() {
      if (series.length === 0) return;
      const subset = series.slice(0, hours);
      const dates = Array.from(new Set(subset.map((s) => new Date(s.time)).map((d) => d.toISOString().slice(0, 10))));
      const entries = await Promise.all(
        dates.map(async (date: string) => {
          try {
            const v = await getSunTimes(lat, lon, date);
            return [date, v] as const;
          } catch {
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
  }, [series, hours, lat, lon]);

  const { markdown } = useMemo(() => {
    // Don't show content until we have data or explicitly know there's no data
    if (loading) {
      return { markdown: "" };
    }
    if (series.length === 0 && showNoData) {
      return {
        markdown: generateNoForecastDataMessage({ locationName: name }),
      };
    }

    // Use pre-warmed graph if available, otherwise pre-cached graph, otherwise pre-rendered graph, otherwise generate new
    if (preWarmedGraph) {
      return { markdown: preWarmedGraph };
    }
    if (preCachedGraph) {
      return { markdown: preCachedGraph };
    }
    if (preRenderedGraph) {
      return { markdown: preRenderedGraph };
    }

    // Generate graph immediately - no delay needed
    const graphMarkdown = buildGraphMarkdown(name, series, hours, { sunByDate });

    return graphMarkdown;
  }, [name, series, hours, sunByDate, showNoData, loading, preWarmedGraph, preCachedGraph, preRenderedGraph]);

  // Generate data table for tab view
  const dataTable = useMemo(() => {
    if (loading || series.length === 0) return "";
    const subset = series.slice(0, hours);
    return buildWeatherTable(subset, { showDirection: true });
  }, [series, hours, loading]);

  // Generate content based on current view
  const finalMarkdown = useMemo(() => {
    if (loading) return "";
    if (series.length === 0 && showNoData) {
      return generateNoForecastDataMessage({ locationName: name });
    }

    const title = `# ${name} – ${hours}h forecast${view === "data" ? " (Data)" : ""}`;
    const content = view === "graph" ? markdown : dataTable;
    return [title, content].join("\n");
  }, [loading, series.length, showNoData, name, hours, view, markdown, dataTable]);

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
export default withErrorBoundary(GraphView, {
  componentName: "Graph View",
  fallback: <GraphErrorFallback componentName="Graph View" />,
});
