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
      <Action onAction={() => openNewTab(query)} title={query ? `Search "${query}"` : "Open Empty Tab"} />
    </ActionPanel>
  );
}

function HistoryItemAction({ entry: { title, url } }: { entry: HistoryEntry }) {
  return (
    <ActionPanel title={title}>
      <ZenOpenTab title={"Open in Zen"} url={url} />
      <Action.OpenInBrowser title="Open in Default Browser" url={url} shortcut={{ modifiers: ["opt"], key: "enter" }} />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
    </ActionPanel>
  );
}

function TabItemAction(props: { tab: Tab }) {
  return (
    <ActionPanel title={props.tab.title}>
      <ZenGoToTab tab={props.tab} />
      <Action.CopyToClipboard title="Copy URL" content={props.tab.url} />
    </ActionPanel>
  );
}

function WorkspaceItemAction(props: { workspace: WorkspaceEntry }) {
  return (
    <ActionPanel title={props.workspace.name}>
      {props.workspace.shortcut && <ZenGoToWorkspace workspace={props.workspace} />}
      <ZenOpenTab title={"Set Workspace Shortcut"} url={"about:preferences#zenCKS"} />
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

function ZenGoToTab(props: { tab: Tab }) {
  async function handleAction() {
    await setActiveTab(props.tab);
    popToRoot();
    closeMainWindow();
  }
  return <Action title="Open Tab" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}

function ZenOpenTab({ title, url }: { title: string; url: string }) {
  async function handleAction() {
    await openTabFromUrl(url);
    popToRoot();
    closeMainWindow();
  }
  return <Action title={title} icon={Icon.ArrowNe} onAction={handleAction} />;
}
