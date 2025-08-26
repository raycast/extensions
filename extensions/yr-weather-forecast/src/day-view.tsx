import { Detail, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { FavoriteToggleAction } from "./components/FavoriteToggleAction";
import { useMemo, useState, useEffect } from "react";
import { buildGraphMarkdown } from "./graph";
import { generateDaySummary, formatSummary } from "./weather-summary";
import { filterToDate, buildWeatherTable } from "./weather-utils";
import { useWeatherData } from "./hooks/useWeatherData";
import { generateNoForecastDataMessage } from "./utils/error-messages";
import { formatDate } from "./utils/date-utils";
import { addFavorite, removeFavorite, isFavorite as checkIsFavorite, type FavoriteLocation } from "./storage";

export default function DayQuickView(props: { name: string; lat: number; lon: number; date: Date }) {
  const { name, lat, lon, date } = props;
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const { series, loading, showNoData } = useWeatherData(lat, lon);

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
    return filterToDate(series, date);
  }, [series, date]);

  const title = useMemo(() => {
    const label = formatDate(date, "LONG_DAY");
    return `${label} (1-day)`;
  }, [date]);

  const graph = useMemo(() => {
    if (daySeries.length === 0 && showNoData) return "";
    return buildGraphMarkdown(name, daySeries, daySeries.length, { title, smooth: true }).markdown;
  }, [name, daySeries, title, showNoData]);

  const summary = useMemo(() => {
    if (daySeries.length === 0 && showNoData) return undefined;
    return generateDaySummary(daySeries);
  }, [daySeries, showNoData]);

  const list = useMemo(() => {
    if (daySeries.length === 0 && showNoData) {
      return generateNoForecastDataMessage({ locationName: name, date });
    }

    return buildWeatherTable(daySeries, { showDirection: true });
  }, [daySeries, showNoData, name, date]);

  const summarySection = summary ? `## Summary\n\n${formatSummary(summary)}\n\n---\n` : "";
  const markdown = [summarySection, graph, "\n---\n", list].join("\n");

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
      markdown={markdown}
      actions={
        <ActionPanel>
          <FavoriteToggleAction isFavorite={isFavorite} onToggle={handleFavoriteToggle} />
        </ActionPanel>
      }
    />
  );
}
