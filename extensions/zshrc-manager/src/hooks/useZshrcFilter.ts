/**
 * Custom hook for filtering and grouping zshrc entries
 *
 * Encapsulates the common pattern of:
 * - Managing search/filter text state
 * - Filtering items based on search criteria
 * - Grouping filtered items by section
 *
 * This hook eliminates duplicate filtering logic across list-based commands.
 */

import { useState, useMemo, useCallback } from "react";

interface FilterableItem {
  /** The section this item belongs to */
  section: string;
  [key: string]: unknown;
}

interface UseZshrcFilterResult<T extends FilterableItem> {
  /** Current search text */
  searchText: string;
  /** Set search text */
  setSearchText: (text: string) => void;
  /** Filtered items matching current search */
  filtered: T[];
  /** Grouped filtered items by section */
  grouped: Record<string, T[]>;
}

/**
 * Hook for filtering and grouping items with search functionality
 *
 * @param items Array of items to filter and group
 * @param searchFields Array of field names to search across (e.g., ["name", "command", "section"])
 * @returns Object with search state and filtered/grouped results
 *
 * @example
 * const items = aliases.map(alias => ({ ...alias, section: "General" }));
 * const { searchText, setSearchText, filtered, grouped } = useZshrcFilter(
 *   items,
 *   ["name", "command", "section"]
 * );
 *
 * return (
 *   <List searchText={searchText} onSearchTextChange={setSearchText}>
 *     {Object.entries(grouped).map(([section, items]) => (
 *       <List.Section key={section} title={section}>
 *         {items.map(item => <List.Item key={item.name} title={item.name} />)}
 *       </List.Section>
 *     ))}
 *   </List>
 * );
 */
export function useZshrcFilter<T extends FilterableItem>(
  items: T[],
  searchFields: string[],
): UseZshrcFilterResult<T> {
  const [searchText, setSearchText] = useState("");

  const filtered = useMemo(() => {
    if (!searchText.trim()) return items;

    const lowerSearch = searchText.toLowerCase();
    return items.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (typeof value === "string") {
          return value.toLowerCase().includes(lowerSearch);
        }
        return false;
      }),
    );
  }, [items, searchText, searchFields]);

  const grouped = useMemo(() => {
    const result: Record<string, T[]> = {};
    filtered.forEach((item) => {
      const section = item.section;
      if (!result[section]) {
        result[section] = [];
      }
      result[section]?.push(item);
    });
    return result;
  }, [filtered]);

  return {
    searchText,
    setSearchText: useCallback((text: string) => setSearchText(text), []),
    filtered,
    grouped,
  };
}
