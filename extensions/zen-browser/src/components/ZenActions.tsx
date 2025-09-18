import { Action, ActionPanel, closeMainWindow, Icon, popToRoot } from "@raycast/api";
import { openTabFromUrl, openNewTab, runShortcut, setActiveTab } from "../actions";
import { HistoryEntry, Shortcut, Tab, WorkspaceEntry } from "../interfaces";

export class ZenActions {
  public static NewTab = NewTabAction;
  public static HistoryItem = HistoryItemAction;
  public static TabListItem = TabItemAction;
  public static WorkspaceItem = WorkspaceItemAction;
}

function NewTabAction({ query }: { query?: string }) {
  return (
    <ActionPanel title="New Tab">
      <Action.Open
        title="Open with Zen"
        target={`${SEARCH_ENGINE[getPreferenceValues<Preferences>().searchEngine.toLowerCase()]}${query || ""}`}
        application={"Zen"}
      />
    </ActionPanel>
  );
}

function HistoryItemAction({ entry: { title, url } }: { entry: HistoryEntry }) {
  return (
    <ActionPanel title={title}>
      <Action.Open title="Open with Zen" target={url} application={"Zen"} />
      <Action.OpenInBrowser title="Open in Default Browser" url={url} shortcut={{ modifiers: ["opt"], key: "enter" }} />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
    </ActionPanel>
  );
}
