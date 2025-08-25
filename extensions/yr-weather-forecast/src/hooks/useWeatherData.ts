import { useEffect, useRef, useState } from "react";
import { getForecast, type TimeseriesEntry } from "../weather-client";

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
 * This centralizes the pattern used across multiple components for fetching
 * weather forecast data with loading states, error handling, and cleanup
 * Now uses the centralized useAsyncState pattern for consistency
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
          setSeries(data);
          setShowNoData(false);
        }
      } catch (err) {
        if (!cancelled) {
          setSeries([]); // Clear existing weather forecasts

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

          console.error("Weather API fetch failed:", errorDetails);

          // Log additional network info if available
          if (typeof navigator !== "undefined" && "onLine" in navigator) {
            console.log("Network status:", navigator.onLine);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);

          // Delay showing "no data" message by 150ms to give API time to catch up
          if (series.length === 0) {
            noDataTimeoutRef.current = setTimeout(() => {
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
  };
}
