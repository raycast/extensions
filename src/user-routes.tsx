import { ActionPanel, Color, List } from "@raycast/api";

import { useState } from "react";
import { useStationSearch } from "./api/client";

export default function Command() {


  const [searchText, setSearchText] = useState<string>("Amsterdam Centraal");
  const { isLoading, data } = useStationSearch(searchText);

  // useEffect(revalidate, [searchText]);

  return <List
    filtering={false}
    isLoading={isLoading}
    onSearchTextChange={setSearchText}
    navigationTitle="Search Route"
    throttle
    searchBarPlaceholder="Search in your favorite routes"
  >
    {((data === undefined ? { payload: [] } : data).payload || []).map((station) => (
      <List.Item
        key={station.UICCode}
        title={station.namen!.lang}
        accessories={[
          // { tag: { value: "IC direct" } },
          // { tag: { color: Color.Orange, value: "Maintenance" } },
          { tag: { color: Color.Blue, value: "3 transfers" } }
          // { tag: { color: Color.Red, value: "+3 min" } },
          // { tag: { color: Color.Red, value: "Journey not possible" } }
        ]}
        actions={
          <ActionPanel>
            {/*<Action title="Select" onAction={() => console.log(`${station} selected`)} />*/}
            {/*<Action title="Add to Favorite" onAction={() => console.log(`${station} selected`)} />;*/}
          </ActionPanel>
        }
      />
    ))}
  </List>;
};
