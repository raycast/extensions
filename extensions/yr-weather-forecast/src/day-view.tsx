import { Detail, Action, ActionPanel, showToast, Toast, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo, useState, useEffect } from "react";
import { buildGraphMarkdown } from "./graph";
import { generateDaySummary, formatSummary } from "./weather-summary";
import { filterToDate, buildWeatherTable } from "./weather-utils";
import { useWeatherData } from "./hooks/useWeatherData";
import { generateNoForecastDataMessage } from "./utils/error-messages";
import { formatDate } from "./utils/date-utils";
import { addFavorite, removeFavorite, isFavorite as checkIsFavorite, type FavoriteLocation } from "./storage";
import { withErrorBoundary } from "./components/error-boundary";
import { WeatherErrorFallback } from "./components/error-fallbacks";

function DayView(props: { name: string; lat: number; lon: number; date: string; onShowWelcome?: () => void }) {
  const { name, lat, lon, date, onShowWelcome } = props;
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

  const daySeries = useMemo(() => {
    return filterToDate(items, new Date(date));
  }, [items, date]);

  const title = useMemo(() => {
    const label = formatDate(date, "LONG_DAY");
    return `${label} (1-day)`;
  }, [date]);

  const graph = useMemo(() => {
    // Don't show graph until we have data or explicitly know there's no data
    if (loading) return "";
    if (daySeries.length === 0 && showNoData) return "";
    return buildGraphMarkdown(name, daySeries, daySeries.length, { title, smooth: true }).markdown;
  }, [name, daySeries, title, showNoData, loading]);

  const summary = useMemo(() => {
    // Don't show summary until we have data or explicitly know there's no data
    if (loading) return undefined;
    if (daySeries.length === 0 && showNoData) return undefined;
    return generateDaySummary(daySeries);
  }, [daySeries, showNoData, loading]);

  const list = useMemo(() => {
    // Don't show list until we have data or explicitly know there's no data
    if (loading) return "";
    if (daySeries.length === 0 && showNoData) {
      return generateNoForecastDataMessage({ locationName: name, date: new Date(date) });
    }

    return buildWeatherTable(daySeries, { showDirection: true });
  }, [daySeries, showNoData, name, date, loading]);

  const summarySection = summary ? `## Summary\n\n${formatSummary(summary)}\n\n---\n` : "";

  // Only show content when not loading and we have data or know there's no data
  const shouldShowContent = !loading && (daySeries.length > 0 || showNoData);
  const markdown = shouldShowContent ? [summarySection, graph, "\n---\n", list].join("\n") : "";

  // Add a small delay to ensure graph is fully rendered before showing content
  const [graphReady, setGraphReady] = useState(false);

  useEffect(() => {
    if (shouldShowContent && daySeries.length > 0) {
      // Small delay to ensure graph SVG is fully generated and rendered
      const timer = setTimeout(() => {
        setGraphReady(true);
      }, 100);

      return () => clearTimeout(timer);
    } else {
      setGraphReady(false);
    }
  }, [shouldShowContent, daySeries.length]);

  // Only show content when graph is ready
  const finalMarkdown = graphReady ? markdown : "";

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
      await showFailureToast(error, { title: "Failed to update favorites" });
    }
  };

  return (
    <Detail
      isLoading={loading}
      markdown={finalMarkdown}
      actions={
        <ActionPanel>
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
export default withErrorBoundary(DayView, {
  componentName: "Day View",
  fallback: <WeatherErrorFallback componentName="Day View" />,
});
