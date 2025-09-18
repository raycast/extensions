import { Icon, List } from "@raycast/api";
import { ZenActions } from "./index";
import { HistoryEntry, Tab, WorkspaceEntry } from "../interfaces";
import { getFavicon } from "@raycast/utils";

export class ZenListEntries {
  public static NewTabEntry = NewTabEntry;
  public static HistoryEntry = HistoryListEntry;
  public static WorkspaceEntry = WorkspaceListEntry;
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

function WorkspaceListEntry({ workspace }: { workspace: WorkspaceEntry }) {
  const shortcutAccessory = workspace.shortcut
    ? {
        text: `${workspace.shortcut.modifiers
          .map((m) => m[0].toUpperCase() + m.slice(1))
          .join("+")}+${workspace.shortcut.key.toUpperCase()}`,
      }
      : { text: "Assign a Shortcut", tooltip: "Shortcuts are necessary to make this feature work" }

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
