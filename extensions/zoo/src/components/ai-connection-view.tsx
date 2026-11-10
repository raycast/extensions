import { Action, ActionPanel, Detail, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { checkConnection } from "../ai/check-connection";
import { describeError, resolveSettings } from "../ai/config";

export function AIConnectionView({ navigationTitle }: { navigationTitle?: string }) {
  const [message, setMessage] = useState(
    "Zoo is checking API access and model availability. This check sends no prompt or input text.",
  );
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    async function check() {
      try {
        const preferences = getPreferenceValues<Preferences>();
        const found = await checkConnection(resolveSettings(preferences), preferences.apikey, controller.signal);
        if (!controller.signal.aborted) {
          setMessage(
            found
              ? "**The connection check passed.**\n\nThe API key can access the service and the selected model appears in its model list. This check does not test text generation, billing quota, or prompt compatibility."
              : "**The service is reachable, but the selected model was not listed.**\n\nCheck your model ID and account access in the provider console. Some services do not list every usable model alias.",
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) setMessage(`**The connection check failed.**\n\n${describeError(error)}`);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    check();
    return () => controller.abort();
  }, [attempt]);

  return (
    <Detail
      navigationTitle={navigationTitle}
      markdown={message}
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action title="Open AI Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
          {!loading && (
            <Action title="Check Again" icon={Icon.Repeat} onAction={() => setAttempt((value) => value + 1)} />
          )}
        </ActionPanel>
      }
    />
  );
}
