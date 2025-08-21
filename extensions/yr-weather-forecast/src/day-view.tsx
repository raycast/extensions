import { Detail } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getForecast, type TimeseriesEntry } from "./weather-client";
import { buildGraphMarkdown } from "./graph";
import { generateDaySummary, formatSummary } from "./weather-summary";
import { filterToDate, buildWeatherTable } from "./weather-utils";

export default function DayQuickView(props: { name: string; lat: number; lon: number; date: Date }) {
  const { name, lat, lon, date } = props;
  const [series, setSeries] = useState<TimeseriesEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [showNoData, setShowNoData] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let errorTimeout: NodeJS.Timeout;
    let noDataTimeout: NodeJS.Timeout;

    (async () => {
      setLoading(true);
      setError(null);
      setShowError(false);
      setShowNoData(false);

      try {
        const data = await getForecast(lat, lon);
        if (!cancelled) {
          setSeries(data);
          setError(null);
          setShowError(false);
          setShowNoData(false);
        }
      } catch (err) {
        if (!cancelled) {
          setSeries([]); // Clear existing weather forecasts
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
          if (series.length === 0) {
            noDataTimeout = setTimeout(() => {
              if (!cancelled) {
                setShowNoData(true);
              }
            }, 150);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      if (errorTimeout) clearTimeout(errorTimeout);
      if (noDataTimeout) clearTimeout(noDataTimeout);
    };
  }, [lat, lon]);

  const daySeries = useMemo(() => {
    return filterToDate(series, date);
  }, [series, date]);

  const title = useMemo(() => {
    const label = date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    return `${label} (1-day)`;
  }, [date]);

  const graph = useMemo(() => {
    if ((error && showError) || (daySeries.length === 0 && showNoData)) return "";
    return buildGraphMarkdown(name, daySeries, daySeries.length, { title, smooth: true }).markdown;
  }, [name, daySeries, title, error, showError, showNoData]);

  const summary = useMemo(() => {
    if ((error && showError) || (daySeries.length === 0 && showNoData)) return undefined;
    return generateDaySummary(daySeries);
  }, [daySeries, error, showError, showNoData]);

  const list = useMemo(() => {
    if (error && showError) {
      return `## ⚠️ Data Fetch Failed

**${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}**

Unable to retrieve weather forecast data from the MET API.

**Error details:**
${error}

**Available options:**
- Check your internet connection
- Try again later
- Verify the location coordinates are correct`;
    }

    if (daySeries.length === 0 && showNoData) {
      return `## ⚠️ No Forecast Data Available

**${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}**

The requested date is beyond the available forecast range (typically 9-10 days). 

**Available options:**
- Try a date within the next week
- Use "next [day]" for upcoming weeks
- Check the full forecast view for available dates`;
    }

    return buildWeatherTable(daySeries, { showDirection: true });
  }, [daySeries, error, showError, showNoData]);

  const summarySection = summary ? `## Summary\n\n${formatSummary(summary)}\n\n---\n` : "";
  const markdown = [summarySection, graph, "\n---\n", list].join("\n");

  return <Detail isLoading={loading} markdown={markdown} />;
}
