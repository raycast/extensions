import { ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { AppDetails, ExtensionPreferences } from "../types";
import { downloadIPA } from "../ipatool";
import { downloadScreenshots } from "../utils/itunes-api";

interface AppActionsProps {
  app: AppDetails;
  onDownload?: (app: AppDetails) => Promise<string | null | undefined>;
  onDownloadScreenshots?: (app: AppDetails) => Promise<string | null | undefined>;
}

/**
 * Reusable component for app-related actions
 */
export function AppActions({ app, onDownload, onDownloadScreenshots }: AppActionsProps) {
  // Get preferences to check if experimental app downloads are enabled
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const isExperimentalDownloadsEnabled = preferences.enableAppDownloads || false;

  // Create a fallback App Store URL if trackViewUrl is not available
  const appStoreUrl = app.trackViewUrl || (app.id ? `https://apps.apple.com/app/id${app.id}` : undefined);

  // Default download handler if none provided
  const handleDownload = async () => {
    try {
      if (onDownload) {
        return await onDownload(app);
      }

      // Fall back to direct download if no handler provided
      return await downloadIPA(app.bundleId, app.name, app.version, app.price);
    } catch (error) {
      console.error("Error downloading app:", error);
      showFailureToast({ title: "Error downloading app", message: String(error) });
      return null;
    }
  };

  const handleDownloadScreenshots = async () => {
    try {
      if (onDownloadScreenshots) {
        return await onDownloadScreenshots(app);
      }

      // Fall back to direct download if no handler provided
      return await downloadScreenshots(app.bundleId, app.name, app.version, app.price);
    } catch (error) {
      console.error("Error downloading screenshots:", error);
      showFailureToast({ title: "Error downloading screenshots", message: String(error) });
      return null;
    }
  };

  return (
    <ActionPanel.Section title="App Actions">
      {isExperimentalDownloadsEnabled && (
        <Action
          title="Download App"
          icon={Icon.Download}
          onAction={handleDownload}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        />
      )}
      <Action
        title="Download Screenshots"
        icon={Icon.Image}
        onAction={handleDownloadScreenshots}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      />
      {appStoreUrl && (
        <Action.OpenInBrowser
          title="View in App Store"
          icon={Icon.AppWindow}
          url={appStoreUrl}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      )}
      {app.artistViewUrl && (
        <Action.OpenInBrowser
          title="View Developer"
          icon={Icon.Person}
          url={app.artistViewUrl}
          shortcut={{ modifiers: ["cmd", "opt"], key: "v" }}
        />
      )}
    </ActionPanel.Section>
  );
}
