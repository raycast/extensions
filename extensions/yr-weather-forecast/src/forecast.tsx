import { Action, ActionPanel, Detail } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getForecast, type TimeseriesEntry } from "./weather-client";
import { buildGraphMarkdown } from "./graph";
import { groupByDay, reduceToDayPeriods, buildWeatherTable } from "./weather-utils";

export default function ForecastView(props: { name: string; lat: number; lon: number }) {
  const { name, lat, lon } = props;
  const [items, setItems] = useState<TimeseriesEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [showNoData, setShowNoData] = useState(false);
  const [mode, setMode] = useState<"detailed" | "summary">("detailed");

  useEffect(() => {
    let cancelled = false;
    let errorTimeout: NodeJS.Timeout;
    let noDataTimeout: NodeJS.Timeout;

    async function fetchData() {
      setLoading(true);
      setError(null);
      setShowError(false);
      setShowNoData(false);

      try {
        const series = await getForecast(lat, lon);
        if (!cancelled) {
          setItems(series);
          setError(null);
          setShowError(false);
          setShowNoData(false);
        }
      } catch (err) {
        if (!cancelled) {
          setItems([]); // Clear existing weather forecasts
          const errorMessage = err instanceof Error ? err.message : "Failed to fetch weather data";
          setError(errorMessage);

          // Delay showing error message by 150ms to give API time to catch up
          errorTimeout = setTimeout(() => {
            if (!cancelled) {
              setShowError(true);
            }
          }, 150);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);

          // Delay showing "no data" message by 150ms to give API time to catch up
          if (items.length === 0) {
            noDataTimeout = setTimeout(() => {
              if (!cancelled) {
                setShowNoData(true);
              }
            }, 150);
          }
        }
      }
    }
    fetchData();
    return () => {
      cancelled = true;
      if (errorTimeout) clearTimeout(errorTimeout);
      if (noDataTimeout) clearTimeout(noDataTimeout);
    };
  }, [lat, lon]);

  const byDay = useMemo(() => groupByDay(items), [items]);
  const reduced = useMemo(() => reduceToDayPeriods(items, 9), [items]);
  const displaySeries = mode === "detailed" ? items.slice(0, 48) : reduced;

  const graph = useMemo(() => {
    if ((error && showError) || (displaySeries.length === 0 && showNoData)) return "";
    const title = mode === "detailed" ? "48h forecast" : "9-day summary";
    const smooth = true; // smooth both 48h detailed and 9-day summary
    return buildGraphMarkdown(name, displaySeries, displaySeries.length, { title, smooth }).markdown;
  }, [name, displaySeries, mode, error, showError, showNoData]);

  const listMarkdown = useMemo(() => {
    if (error && showError) {
      return `## ⚠️ Data Fetch Failed

Unable to retrieve weather forecast data from the MET API.

**Error details:**
${error}

**Available options:**
- Check your internet connection
- Try again later
- Verify the location coordinates are correct`;
    }

    if (displaySeries.length === 0 && showNoData) {
      return `## ⚠️ No Forecast Data Available

No weather forecast data is currently available for this location.

**Available options:**
- Check the location coordinates
- Try refreshing the data
- Contact support if the issue persists`;
    }

    return mode === "detailed" ? buildListMarkdown(byDay) : buildSummaryListMarkdown(reduced);
  }, [mode, byDay, reduced, error, showError, displaySeries.length, showNoData]);

  const markdown = [graph, "\n---\n", listMarkdown].join("\n");

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
