import { List, ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";

export default function ZeaburTokenUndefined() {
  return (
    <List
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <List.EmptyView icon={Icon.Key} title="Please set Zeabur Token in the extension preferences" />
    </List>
  );
}
