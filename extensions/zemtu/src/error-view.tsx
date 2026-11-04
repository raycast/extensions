import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
import CheckSettings from "./check-settings";

interface ErrorEmptyViewProps {
  description: string;
  onRetry?: () => void;
}

// Failed requests must not look like an empty result, so lists show this instead
export function ErrorEmptyView({ description, onRetry }: ErrorEmptyViewProps) {
  return (
    <List.EmptyView
      icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
      title="Error"
      description={description}
      actions={
        <ActionPanel>
          {onRetry ? <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} /> : null}
          <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.Push
            title="Check Settings"
            icon={Icon.Checkmark}
            target={<CheckSettings navigationTitle="Check Settings" />}
          />
        </ActionPanel>
      }
    />
  );
}
