import { Action, ActionPanel, Detail, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { checkConnection } from "../ai/check-connection";
import { describeError, resolveSettings } from "../ai/config";

export function AIConnectionView({ navigationTitle }: { navigationTitle?: string }) {
  const abortable = useRef(new AbortController());
  const {
    data: message,
    isLoading,
    revalidate,
  } = usePromise(
    async () => {
      try {
        const preferences = getPreferenceValues<Preferences>();
        const found = await checkConnection(resolveSettings(preferences), preferences.apikey, abortable.current.signal);
        return found
          ? "**The connection check passed.**\n\nThe API key can access the service and the selected model appears in its model list. This check does not test text generation, billing quota, or prompt compatibility."
          : "**The service is reachable, but the selected model was not listed.**\n\nCheck your model ID and account access in the provider console. Some services do not list every usable model alias.";
      } catch (error) {
        return `**The connection check failed.**\n\n${describeError(error)}`;
      }
    },
    [],
    { abortable },
  );

  return (
    <Detail
      navigationTitle={navigationTitle}
      markdown={
        isLoading
          ? "Zoo is checking API access and model availability. This check sends no prompt or input text."
          : message
      }
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Open AI Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
          {!isLoading && <Action title="Check Again" icon={Icon.Repeat} onAction={revalidate} />}
        </ActionPanel>
      }
    />
  );
}
