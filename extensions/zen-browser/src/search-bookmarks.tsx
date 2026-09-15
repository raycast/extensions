import { getPreferenceValues, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { ReactElement, useState } from "react";
import { ZenActions, ZenListEntries } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import { usePinnedTabs } from "./hooks/usePinnedTabs";
import { Preferences } from "./interfaces";
import { searchPinnedTabs } from "./util/pinned-tabs";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, errorView, data } = useBookmarkSearch(searchText);
  const { data: tabs, isLoading: tabsLoading, error: bridgeError } = usePinnedTabs();
  const limit = Number(getPreferenceValues<Preferences>().limitResults);
  const pinnedTabs = searchPinnedTabs(tabs ?? [], searchText).slice(0, limit);
  const bookmarks = data ?? [];

  if (errorView) return errorView;

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading || tabsLoading}
      filtering={false}
      searchBarPlaceholder="Search bookmarks and pinned tabs…"
      throttle={false}
    >
      <List.Section title="Pinned Tabs & Essentials">
        {bridgeError && (
          <List.Item title="Zen Bridge Unavailable" subtitle={String(bridgeError.message)} icon={Icon.Warning} />
        )}
        {pinnedTabs.map((entry) => (
          <List.Item
            key={entry.id}
            id={`pin:${entry.id}`}
            title={entry.title}
            subtitle={entry.url}
            icon={getFavicon(entry.url)}
            actions={<ZenActions.PinnedItem entry={entry} />}
          />
        ))}
      </List.Section>
      <List.Section title="Bookmarks">
        {bookmarks.map((entry) => (
          <ZenListEntries.HistoryEntry entry={entry} key={entry.id} />
        ))}
      </List.Section>
    </List>
  );
}
