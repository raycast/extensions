import { useEffect, useRef, useState } from "react";
import { getForecast, type TimeseriesEntry } from "../weather-client";
import { DebugLogger } from "../utils/debug-utils";

// Type declaration for navigator to handle browser environment
declare global {
  const navigator:
    | {
        userAgent?: string;
        onLine?: boolean;
      }
    | undefined;
}

/**
 * Custom hook for managing weather data fetching
 */
export function useWeatherData(lat: number, lon: number) {
  const [series, setSeries] = useState<TimeseriesEntry[]>([]);
  const [showNoData, setShowNoData] = useState(false);

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
        const data = await getForecast(lat, lon);
        if (!cancelled) {
          // Ensure data is always an array
          const safeData = Array.isArray(data) ? data : [];
          setSeries(safeData);

          // Only show no data if we actually have no data after fetching
          if (safeData.length === 0) {
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
            userAgent:
              typeof navigator !== "undefined" ? navigator.userAgent || "Raycast Extension" : "Raycast Extension",
          };

          DebugLogger.error("Weather API fetch failed:", errorDetails);

          // Log additional network info if available
          if (typeof navigator !== "undefined" && "onLine" in navigator) {
            DebugLogger.log("Network status:", navigator.onLine);
          }
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

  // Ensure series is always an array to prevent runtime errors
  const safeSeries = Array.isArray(series) ? series : [];

  return {
    series: safeSeries,
    loading,
    showNoData,
  };
}
