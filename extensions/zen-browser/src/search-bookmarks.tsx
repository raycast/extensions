import { ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { ReactElement, useState } from "react";
import { ZenActions, ZenListEntries } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import { usePinnedTabs } from "./hooks/usePinnedTabs";
import { Preferences } from "./interfaces";
import { BridgeActions } from "./components/BridgeActions";
import { searchPinnedTabs } from "./util/pinned-tabs";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, errorView, data } = useBookmarkSearch(searchText);
  const { data: tabs, isLoading: tabsLoading, error: bridgeError, revalidate } = usePinnedTabs();
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
      actions={
        <ActionPanel>
          <BridgeActions refresh={revalidate} />
        </ActionPanel>
      }
    >
      <List.Section title="Pinned Tabs & Essentials">
        {bridgeError && (
          <List.Item
            title="Connect to Zen Browser"
            subtitle={String(bridgeError.message)}
            icon={Icon.Plug}
            actions={
              <ActionPanel>
                <BridgeActions refresh={revalidate} />
              </ActionPanel>
            }
          />
        )}
        {pinnedTabs.map((entry) => (
          <List.Item
            key={entry.id}
            id={`pin:${entry.id}`}
            title={entry.title}
            subtitle={entry.url}
            icon={getFavicon(entry.url)}
            actions={<ZenActions.PinnedItem entry={entry} refresh={revalidate} />}
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
