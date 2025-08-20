/**
 * Main command component for searching WinGet and Homebrew packages
 * Features debounced search, ecosystem filtering, and request deduplication
 */
import { List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchPackages } from "./api";
import type { SearchResult } from "./types";
import ResultItem from "./components/ResultItem";
import { useDebouncedValue } from "./hooks/useDebouncedValue";

type Prefs = {
  apiBaseUrl: string;
  defaultEcosystem: "all" | "homebrew" | "winget";
  pageSize: string;
};

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const [query, setQuery] = useState("");
  const [ecosystem, setEcosystem] = useState<"all" | "homebrew" | "winget">(prefs.defaultEcosystem || "all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Pagination not implemented yet - keeping simple for initial version
  // Max limit is clamped to 12 in api.ts to align with API constraints
  const limit = useMemo(() => Math.max(1, Math.min(12, parseInt(prefs.pageSize || "12", 10))), [prefs.pageSize]);
  const debounced = useDebouncedValue(query, 250);

  // Request deduplication: prevents race conditions from multiple rapid searches
  const lastReq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const reqId = Date.now();
    lastReq.current = reqId;

    async function run() {
      // Don't search if query is empty
      if (!debounced.trim()) {
        if (!cancelled && lastReq.current === reqId) {
          setResults([]);
          setError(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Search for packages using the debounced query
        const data = await searchPackages(debounced, ecosystem, limit);
        if (!cancelled && lastReq.current === reqId) {
          setResults(data.results || []);
          // Update results state with fetched data
        }
      } catch (e) {
        // Handle search errors gracefully
        const errorMessage = e instanceof Error ? e.message : "Search failed";

        if (!cancelled && lastReq.current === reqId) {
          setError(errorMessage);
          setResults([]);

          // Show toast for API errors
          showToast({
            style: Toast.Style.Failure,
            title: "Search Error",
            message: errorMessage,
          });
        }
      } finally {
        if (!cancelled && lastReq.current === reqId) {
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debounced, ecosystem, limit]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchText={query}
      searchBarPlaceholder="Search Homebrew + WinGet..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Ecosystem"
          storeValue={true}
          onChange={(v) => setEcosystem(v as "all" | "homebrew" | "winget")}
          value={ecosystem}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="WinGet" value="winget" />
          <List.Dropdown.Item title="Homebrew" value="homebrew" />
        </List.Dropdown>
      }
      isShowingDetail={false}
    >
      {error ? (
        <List.EmptyView icon="⚠️" title="Search Error" description={error} />
      ) : results.length === 0 && !isLoading && debounced.trim() ? (
        <List.EmptyView icon="🔍" title="No Results Found" description={`No packages found for "${debounced}"`} />
      ) : results.length === 0 && !debounced.trim() ? (
        <List.EmptyView icon="📦" title="Search Packages" description="Type to search WinGet and Homebrew packages" />
      ) : (
        <List.Section title="Results" subtitle={String(results.length)}>
          {results.map((r) => (
            <ResultItem key={`${r.ecosystem}:${r.id}`} item={r} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
