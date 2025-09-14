import { Icon, List } from "@raycast/api";
import { ZenActions } from "./index";
import { HistoryEntry, Tab, WorkspaceEntry } from "../interfaces";
import { getFavicon } from "@raycast/utils";

export class ZenListEntries {
  public static NewTabEntry = NewTabEntry;
  public static HistoryEntry = HistoryListEntry;
  public static WorkspaceEntry = WorkspaceListEntry;
  public static TabEntry = TabListEntry;
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

function TabListEntry({ tab }: { tab: Tab }) {
  return (
    <List.Item
      title={tab.title}
      subtitle={tab.url}
      actions={<ZenActions.TabListItem tab={tab} />}
      icon={getFavicon(tab.url)}
    />
  );
}

function WorkspaceListEntry({ workspace }: { workspace: WorkspaceEntry }) {
  const shortcutAccessory = workspace.shortcut
    ? {
        text: `${workspace.shortcut.modifiers
          .map((m) => m[0].toUpperCase() + m.slice(1))
          .join("+")}+${workspace.shortcut.key.toUpperCase()}`,
      }
    : { text: { value: "Assign a Shortcut" }, tooltip: "Shorcuts are necessary to make this feature work" };

  return (
    <List.Item
      title={workspace.name}
      accessories={[{ text: workspace.is_default ? "Default" : "" }, shortcutAccessory]}
      actions={<ZenActions.WorkspaceItem workspace={workspace} />}
      icon={{ source: workspace.icon }}
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
