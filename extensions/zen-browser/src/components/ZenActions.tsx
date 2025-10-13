import { Action, ActionPanel, closeMainWindow, getPreferenceValues, Icon, popToRoot } from "@raycast/api";
import { HistoryEntry, Shortcut, WorkspaceEntry } from "../interfaces";
import { SEARCH_ENGINE } from "../constants";
import { runShortcut } from "../actions";

export class ZenActions {
  public static NewTab = NewTabAction;
  public static HistoryItem = HistoryItemAction;
  public static WorkspaceItem = WorkspaceItemAction;
}

function NewTabAction({ query }: { query?: string }) {
  return (
    <ActionPanel title="New Tab">
      <Action.Open
        title="Open with Zen"
        target={`${SEARCH_ENGINE[getPreferenceValues().searchEngine.toLowerCase()]}${query || ""}`}
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

function WorkspaceItemAction(props: { workspace: WorkspaceEntry }) {
  return (
    <ActionPanel title={props.workspace.name}>
      {props.workspace.shortcut && <ZenGoToWorkspace workspace={props.workspace} />}
      <Action.Open title="Change Shortcut in Keyboard Shortcuts" target={"about:preferences"} application={"Zen"} />
    </ActionPanel>
  );
}

function ZenGoToWorkspace(props: { workspace: WorkspaceEntry }) {
  return (
    <Action
      title="Open Workspace"
      icon={Icon.AppWindowSidebarLeft}
      onAction={async () => {
        await runShortcut(props.workspace.shortcut as Shortcut);
        popToRoot();
        closeMainWindow();
      }}
    />
  );
}
