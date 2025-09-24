import { useEffect, useRef, useState } from "react";
import { getForecast, type TimeseriesEntry } from "../weather-client";
import { DebugLogger } from "../utils/debug-utils";
import { buildGraphMarkdown } from "../graph";

/**
 * Custom hook for managing weather data fetching
 */
export function useWeatherData(lat: number, lon: number, preGenerateGraph = false) {
  const [series, setSeries] = useState<TimeseriesEntry[]>([]);
  const [showNoData, setShowNoData] = useState(false);
  const [preRenderedGraph, setPreRenderedGraph] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);
  const noDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;
    cancelledRef.current = cancelled;

    async function fetchData() {
      setLoading(true);
      setShowNoData(false);

      try {
        const result = await getForecast(lat, lon);
        if (!cancelled) {
          setSeries(result);

          // Pre-generate graph if requested and we have data
          if (preGenerateGraph && result.length > 0) {
            const graphMarkdown = buildGraphMarkdown("Location", result, 48, {
              title: "48h forecast",
              smooth: true,
            }).markdown;
            setPreRenderedGraph(graphMarkdown);
          }

          // Only show no data if we actually have no data after fetching
          if (result.length === 0) {
            setShowNoData(true);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setSeries([]); // Clear existing weather forecasts
          setShowNoData(true); // Show no data message on error

          // Enhanced error logging for debugging
          const errorDetails = {
            message: err instanceof Error ? err.message : String(err),
            cause: err instanceof Error ? err.cause : undefined,
            stack: err instanceof Error ? err.stack : undefined,
            timestamp: new Date().toISOString(),
            coordinates: { lat, lon },
            userAgent: "Raycast Extension",
          };

          DebugLogger.error("Weather API fetch failed:", errorDetails);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);

          // Clear any pending no-data timeout since we've handled it above
          if (noDataTimeoutRef.current) {
            clearTimeout(noDataTimeoutRef.current);
            noDataTimeoutRef.current = null;
          }
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
      cancelledRef.current = true;
      if (noDataTimeoutRef.current) {
        clearTimeout(noDataTimeoutRef.current);
        noDataTimeoutRef.current = null;
      }
    };
  }, [lat, lon]);

  return {
    series,
    loading,
    showNoData,
    preRenderedGraph,
  };
}
