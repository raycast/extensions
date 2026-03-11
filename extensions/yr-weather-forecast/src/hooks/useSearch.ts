import { useState, useCallback, useEffect, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { searchLocations, type LocationResult } from "../location-search";
import { parseQueryIntent, type QueryIntent } from "../query-intent";
import { useDebouncedCallback } from "./useDebounce";
import { UI_THRESHOLDS, TIMING_THRESHOLDS, GRAPH_THRESHOLDS } from "../config/weather-config";
import { DebugLogger } from "../utils/debug-utils";
import { LocationUtils } from "../utils/location-utils";
import { ToastMessages } from "../utils/toast-utils";

export interface UseSearchReturn {
  // Search state
  searchText: string;
  setSearchText: (text: string) => void;
  locations: LocationResult[];
  isLoading: boolean;
  queryIntent: QueryIntent;

  // Search actions
  performSearch: (query: string) => Promise<void>;
  clearSearch: () => void;

  // Computed values
  safeLocations: LocationResult[];
  hasSearchResults: boolean;
  isSearching: boolean;
  searchError: string | null;
}

/**
 * Custom hook for managing search functionality
 * Handles search text, query parsing, debouncing, and location search
 */
export function useSearch(): UseSearchReturn {
  // Search state
  const [searchText, setSearchText] = useState("");
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [queryIntent, setQueryIntent] = useState<QueryIntent>({});
  const [searchError, setSearchError] = useState<string | null>(null);
  const activeSearchControllerRef = useRef<AbortController | null>(null);
  const lastToastedDateRef = useRef<string | null>(null);

  // Search function with query intent parsing (no debouncing here)
  const performSearch = useCallback(async (...args: unknown[]): Promise<void> => {
    const query = args[0] as string;
    const trimmed = query.trim();
    if (!trimmed) {
      activeSearchControllerRef.current?.abort();
      setLocations([]);
      setQueryIntent({});
      lastToastedDateRef.current = null;
      setSearchError(null);
      setIsLoading(false);
      return;
    }

    // Parse query intent to extract location and date information
    const intent = parseQueryIntent(trimmed);

    // Use the parsed location query if available, otherwise use the full query
    const locationQuery = intent.locationQuery || trimmed;

    // Require minimum characters before searching
    const minChars = UI_THRESHOLDS.SEARCH_MIN_CHARS;
    if (locationQuery.length < minChars) {
      activeSearchControllerRef.current?.abort();
      setLocations([]);
      setQueryIntent({});
      lastToastedDateRef.current = null;
      setSearchError(null);
      setIsLoading(false);
      return;
    }

    setQueryIntent(intent);

    // Show toast notification if a date query was successfully parsed
    if (intent.targetDate) {
      const dateKey = intent.targetDate.toISOString();
      if (dateKey !== lastToastedDateRef.current) {
        lastToastedDateRef.current = dateKey;
        const dateStr = intent.targetDate.toLocaleDateString();
        const isToday = intent.targetDate.toDateString() === new Date().toDateString();
        const isTomorrow =
          intent.targetDate.toDateString() ===
          new Date(Date.now() + GRAPH_THRESHOLDS.STYLING.MILLISECONDS_PER_DAY).toDateString();

        let dateLabel = dateStr;
        if (isToday) dateLabel = "today";
        else if (isTomorrow) dateLabel = "tomorrow";

        showToast({
          style: Toast.Style.Success,
          title: `📅 ${dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} weather query detected!`,
          message: `Search results will show weather for ${dateLabel} - tap any location to view detailed forecast`,
        });
      }
    }

    setIsLoading(true);
    setSearchError(null);

    try {
      activeSearchControllerRef.current?.abort();
      const controller = new AbortController();
      activeSearchControllerRef.current = controller;

      const results = await searchLocations(locationQuery, { signal: controller.signal });
      const sortedResults = LocationUtils.sortLocationsByPrecision(results, locationQuery);
      setLocations(sortedResults);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      DebugLogger.error("Search failed:", error);
      void ToastMessages.locationApiUnavailable();
      setLocations([]);
      setSearchError(error instanceof Error ? error.message : "Search failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search function
  const debouncedSearch = useDebouncedCallback(performSearch, TIMING_THRESHOLDS.SEARCH_DEBOUNCE);

  // Clear search function
  const clearSearch = useCallback(() => {
    setSearchText("");
    setLocations([]);
    setQueryIntent({});
    setSearchError(null);
    setIsLoading(false);
    lastToastedDateRef.current = null;
  }, []);

  // Trigger search when search text changes with debouncing
  useEffect(() => {
    const q = searchText.trim();
    if (q.length > 0) {
      debouncedSearch(q);
    } else {
      activeSearchControllerRef.current?.abort();
      setLocations([]);
      setQueryIntent({});
      setIsLoading(false);
      setSearchError(null);
      lastToastedDateRef.current = null;
    }
  }, [searchText, debouncedSearch]);

  // Computed values
  const safeLocations = locations || [];
  const hasSearchResults = safeLocations.length > 0;
  const isSearching = isLoading && searchText.trim().length > 0;

  return {
    // Search state
    searchText,
    setSearchText,
    locations: safeLocations,
    isLoading,
    queryIntent,

    // Search actions
    performSearch,
    clearSearch,

    // Computed values
    safeLocations,
    hasSearchResults,
    isSearching,
    searchError,
  };
}
