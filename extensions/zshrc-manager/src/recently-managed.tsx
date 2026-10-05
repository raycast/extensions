/**
 * Recently Managed: every entry in the zshrc, ordered by how recently and
 * how often it has been opened or edited in this extension (frecency). The
 * ranking tracks activity inside Raycast, not shell usage.
 *
 * Shares the frecency namespace with the home surface, so acting on an
 * entry from either place feeds the same ranking.
 */

import { List } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { useMemo, useState } from "react";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { createSearchResults, filterResults, SearchResultListItem } from "./lib/search-results";
import { DetailToggleContext } from "./lib/shared-actions";

export default function RecentlyManaged() {
  const { sections, isLoading, refresh } = useZshrcLoader("Recently Managed");
  const [searchText, setSearchText] = useState("");
  const [showDetail, setShowDetail] = useState(true);
  const [revealedIds, setRevealedIds] = useState<ReadonlySet<string>>(new Set());

  const results = useMemo(() => createSearchResults(sections), [sections]);
  const { data: ranked, visitItem } = useFrecencySorting(results, {
    key: (result) => result.id,
    namespace: "zshrc-home",
  });

  const rows = searchText.trim() ? filterResults(ranked, searchText) : ranked;

  const toggleReveal = (id: string) => {
    setRevealedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <DetailToggleContext.Provider value={{ shown: showDetail, toggle: () => setShowDetail((shown) => !shown) }}>
      <List
        navigationTitle="Recently Managed"
        searchBarPlaceholder="Search recently managed entries…"
        searchText={searchText}
        onSearchTextChange={setSearchText}
        isLoading={isLoading}
        isShowingDetail={showDetail}
      >
        <List.Section title="Most Recently Managed First" subtitle={String(rows.length)}>
          {rows.map((result) => (
            <SearchResultListItem
              key={result.id}
              result={result}
              refresh={refresh}
              revealed={revealedIds.has(result.id)}
              onToggleReveal={() => toggleReveal(result.id)}
              showDetail={showDetail}
              showSubtitle={!showDetail}
              onVisit={() => visitItem(result)}
            />
          ))}
        </List.Section>
      </List>
    </DetailToggleContext.Provider>
  );
}
