import { Action, ActionPanel, List } from "@raycast/api";

import { useState } from "react";
import { useStationSearch } from "./api/client";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("Amsterdam Centraal");
  const { isLoading, data } = useStationSearch(searchText);

  return <List
    filtering={true}
    isLoading={isLoading}
    onSearchTextChange={setSearchText}
    navigationTitle="Search a station"
    throttle
    searchBarPlaceholder="Search station"
  >
    {((data === undefined ? { payload: [] } : data).payload || []).map((station) => (
      <List.Item
        key={station.UICCode}
        title={station.namen!.lang}
        actions={
          <ActionPanel>
            <Action title="Add to Favorite" onAction={() => console.log(`${station} selected`)} />
          </ActionPanel>
        }
      />
    ))}
  </List>;
};
