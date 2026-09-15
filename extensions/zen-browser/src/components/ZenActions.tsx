import {
  showToast,
  Toast,
  Action,
  ActionPanel,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  open,
  popToRoot,
} from "@raycast/api";
import { HistoryEntry, Shortcut, WorkspaceEntry } from "../interfaces";
import { SEARCH_ENGINE } from "../constants";
import { runShortcut } from "../actions";
import { platform } from "os";
import { runPowerShellScript } from "@raycast/utils";

import { switchPinnedTab } from "../actions/switch-pinned-tab";
import { PinnedTabEntry } from "../util/pinned-tabs";

export class ZenActions {
  public static PinnedItem = PinnedItemAction;
  public static NewTab = NewTabAction;
  public static HistoryItem = HistoryItemAction;
  public static WorkspaceItem = WorkspaceItemAction;
}

function NewTabAction({ query }: { query?: string }) {
  return (
    <ActionPanel title="New Tab">
      <Action
        title="Open with Zen"
        onAction={async () => {
          if (platform() === "win32") {
            await runPowerShellScript(
              `Start-Process "zen" "${SEARCH_ENGINE[getPreferenceValues().searchEngine.toLowerCase()]}${query || ""}"`,
            );
          } else {
            open(`${SEARCH_ENGINE[getPreferenceValues().searchEngine.toLowerCase()]}${query || ""}`, "zen");
          }
        }}
      />
    </ActionPanel>
  );
}

function HistoryItemAction({ entry: { title, url } }: { entry: HistoryEntry }) {
  return (
    <ActionPanel title={title}>
      <Action
        title="Open with Zen"
        onAction={async () => {
          if (platform() === "win32") {
            await runPowerShellScript(`Start-Process "zen" "${url}"`);
          } else {
            open(url, "zen");
          }
        }}
      />
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

function PinnedItemAction({ entry }: { entry: PinnedTabEntry }) {
  return (
    <ActionPanel title={entry.title}>
      <Action
        title="Switch to Pinned Tab"
        icon={Icon.Pin}
        onAction={async () => {
          try {
            await switchPinnedTab(entry);
          } catch (error) {
            console.error(error);
            await showToast({
              style: Toast.Style.Failure,
              title: "Could Not Switch to Tab",
              message: error instanceof Error ? error.message : String(error),
            });
          }
        }}
      />
      <Action.CopyToClipboard
        title="Copy URL"
        content={entry.url}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    </ActionPanel>
  );
}
