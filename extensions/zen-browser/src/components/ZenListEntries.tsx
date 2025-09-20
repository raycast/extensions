import { Icon, List } from "@raycast/api";
import { ZenActions } from "./index";
import { HistoryEntry, Tab } from "../interfaces";
import { getFavicon } from "@raycast/utils";

export class ZenListEntries {
  public static NewTabEntry = NewTabEntry;
  public static HistoryEntry = HistoryListEntry;
}

function NewTabEntry({ searchText }: { searchText?: string }) {
  return (
    <List.Item
      title={!searchText ? "Open Empty Tab" : `Search "${searchText}"`}
      icon={{ source: !searchText ? Icon.Plus : Icon.MagnifyingGlass }}
      actions={<ZenActions.NewTab query={searchText} />}
    />
  );
}

function HistoryListEntry({ entry: { url, title, id, lastVisited } }: { entry: HistoryEntry }) {
  return (
    <List.Item
      id={id.toString()}
      title={title || ""}
      subtitle={url}
      icon={getFavicon(url)}
      actions={<ZenActions.HistoryItem entry={{ url, title, id, lastVisited }} />}
    />
  );
}
