import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { FavoriteToggleAction } from "./components/FavoriteToggleAction";
import { useMemo, useState, useEffect } from "react";
import { type TimeseriesEntry } from "./weather-client";
import { buildGraphMarkdown } from "./graph";
import { groupByDay, reduceToDayPeriods, buildWeatherTable } from "./weather-utils";
import { useWeatherData } from "./hooks/useWeatherData";
import { generateNoForecastDataMessage } from "./utils/error-messages";
import { addFavorite, removeFavorite, isFavorite as checkIsFavorite, type FavoriteLocation } from "./storage";

export default function ForecastView(props: { name: string; lat: number; lon: number }) {
  const { name, lat, lon } = props;
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
  const reduced = useMemo(() => reduceToDayPeriods(items, 9), [items]);
  const displaySeries = mode === "detailed" ? items.slice(0, 48) : reduced;

  const graph = useMemo(() => {
    if (displaySeries.length === 0 && showNoData) return "";
    const title = mode === "detailed" ? "48h forecast" : "9-day summary";
    const smooth = true; // smooth both 48h detailed and 9-day summary
    return buildGraphMarkdown(name, displaySeries, displaySeries.length, { title, smooth }).markdown;
  }, [name, displaySeries, mode, showNoData]);

  const listMarkdown = useMemo(() => {
    if (displaySeries.length === 0 && showNoData) {
      return generateNoForecastDataMessage({ locationName: name });
    }

    return mode === "detailed" ? buildListMarkdown(byDay) : buildSummaryListMarkdown(reduced);
  }, [mode, byDay, reduced, displaySeries.length, showNoData, name]);

  const markdown = [graph, "\n---\n", listMarkdown].join("\n");

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
          {mode === "detailed" ? (
            <Action title="Show 9-Day Summary" onAction={() => setMode("summary")} />
          ) : (
            <Action title="Show 2-Day Detailed" onAction={() => setMode("detailed")} />
          )}
          <FavoriteToggleAction isFavorite={isFavorite} onToggle={handleFavoriteToggle} />
        </ActionPanel>
      }
    />
  );
}

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
