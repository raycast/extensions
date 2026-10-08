import { List } from "@raycast/api";
import { ReactElement, useState } from "react";
import { ZenListEntries } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, errorView, data } = useBookmarkSearch(searchText);

  if (errorView) {
    return errorView;
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={false}>
      {data?.map((e) => (
        <ZenListEntries.HistoryEntry entry={e} key={e.id} />
      ))}
    </List>
  );
}
