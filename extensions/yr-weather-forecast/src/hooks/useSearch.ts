import { useState, useCallback, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { searchLocations, type LocationResult } from "../location-search";
import { parseQueryIntent, type QueryIntent } from "../query-intent";
import { useDebouncedCallback } from "./useDebounce";
import { getUIThresholds, getTimingThresholds } from "../config/weather-config";
import { DebugLogger } from "../utils/debug-utils";

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

  // Search function with query intent parsing (no debouncing here)
  const performSearch = useCallback(async (...args: unknown[]): Promise<void> => {
    const query = args[0] as string;
    const trimmed = query.trim();
    if (!trimmed) {
      setLocations([]);
      setQueryIntent({});
      setSearchError(null);
      return;
    }

    // Parse query intent to extract location and date information
    const intent = parseQueryIntent(trimmed);
    setQueryIntent(intent);

    // Show toast notification if a date query was successfully parsed
    if (intent.targetDate) {
      const dateStr = intent.targetDate.toLocaleDateString();
      const isToday = intent.targetDate.toDateString() === new Date().toDateString();
      const isTomorrow = intent.targetDate.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

      let dateLabel = dateStr;
      if (isToday) dateLabel = "today";
      else if (isTomorrow) dateLabel = "tomorrow";

      showToast({
        style: Toast.Style.Success,
        title: `📅 ${dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} weather query detected!`,
        message: `Search results will show weather for ${dateLabel} - tap any location to view detailed forecast`,
      });
    }

    // Use the parsed location query if available, otherwise use the full query
    const locationQuery = intent.locationQuery || trimmed;

    // Require minimum characters before searching
    const minChars = getUIThresholds().SEARCH_MIN_CHARS;
    if (locationQuery.length < minChars) {
      setLocations([]);
      setSearchError(null);
      return;
    }

    setIsLoading(true);
    setSearchError(null);

    try {
      const results = await searchLocations(locationQuery);
      setLocations(results);
    } catch (error) {
      DebugLogger.error("Search failed:", error);
      setLocations([]);
      setSearchError(error instanceof Error ? error.message : "Search failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search function
  const debouncedSearch = useDebouncedCallback(performSearch, getTimingThresholds().SEARCH_DEBOUNCE);

  // Clear search function
  const clearSearch = useCallback(() => {
    setSearchText("");
    setLocations([]);
    setQueryIntent({});
    setSearchError(null);
    setIsLoading(false);
  }, []);

  // Trigger search when search text changes with debouncing
  useEffect(() => {
    const q = searchText.trim();
    if (q) {
      // Parse query intent to check if we have a valid location query
      const intent = parseQueryIntent(q);
      const locationQuery = intent.locationQuery || q;

      const minChars = getUIThresholds().SEARCH_MIN_CHARS;
      if (locationQuery.length >= minChars) {
        debouncedSearch(q);
      } else {
        // Clear locations but keep query intent for display
        setLocations([]);
        setIsLoading(false);
        setSearchError(null);
      }
    } else {
      setLocations([]);
      setQueryIntent({});
      setIsLoading(false);
      setSearchError(null);
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
