import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getUsage, type Usage } from "./api";

function bar(used: number, limit: number): string {
  const width = 24;
  const filled = limit > 0 ? Math.min(width, Math.round((used / limit) * width)) : 0;
  return "█".repeat(filled) + "░".repeat(Math.max(0, width - filled));
}

export default function UsageCommand() {
  const { data, isLoading, error, revalidate } = usePromise(() => getUsage(), []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={data ? view(data) : error ? errorView(error.message) : "Reading the account…"}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action.OpenInBrowser title="Open Plan Page" url="https://app.zipirapp.com/fatura" />
          {error ? (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function errorView(message: string): string {
  return [
    "# Could not load your video minutes",
    "",
    message,
    "",
    "Check the API key and the connection in the extension preferences.",
  ].join("\n");
}

function view(usage: Usage): string {
  const { minutes, period, key } = usage;
  const percent = minutes.limit > 0 ? Math.round((minutes.used / minutes.limit) * 100) : 0;
  const lines = [
    "# " + (minutes.remaining > 0 ? minutes.remaining + " min left" : "No minutes left"),
    "",
    "```",
    bar(minutes.used, minutes.limit) + "  " + percent + "%",
    "```",
    "",
    "- **Used this period:** " + minutes.used + " / " + minutes.limit + " min",
    "- **Remaining:** " + minutes.remaining + " min" + (minutes.over ? " (over the limit)" : ""),
    "- **Period:** " + new Date(period.start).toLocaleDateString() + " → " + new Date(period.end).toLocaleDateString(),
    "- **API key:** " + key.name + " (" + key.prefix + "…)",
    "",
    "Rendering a lesson counts its length against these minutes; a single-scene edit does not.",
  ];
  return lines.join("\n");
}
