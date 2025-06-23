import { ActionPanel, Action, Icon, Clipboard, showToast, Toast } from "@raycast/api";
import { AppDetails } from "../types";

interface CopyActionsProps {
  app: AppDetails;
}

/**
 * Reusable component for copy-related actions
 */
export function CopyActions({ app }: CopyActionsProps) {
  // Function to copy text to clipboard
  async function copyToClipboard(text: string, toastTitle: string) {
    await Clipboard.copy(text);
    showToast(Toast.Style.Success, toastTitle, "Copied to clipboard");
  }

  // Create a fallback App Store URL if trackViewUrl is not available
  const appStoreUrl = app.trackViewUrl || `https://apps.apple.com/app/id${app.id}`;

  return (
    <ActionPanel.Section title="Copy">
      <Action title="Copy App Name" icon={Icon.Clipboard} onAction={() => copyToClipboard(app.name, "App Name")} />
      {app.version && (
        <Action
          title="Copy Version"
          icon={Icon.Clipboard}
          onAction={() => copyToClipboard(app.version, "App Version")}
        />
      )}
      <Action
        title="Copy Bundle Id"
        icon={Icon.Clipboard}
        onAction={() => copyToClipboard(app.bundleId, "Bundle Id")}
      />
      <Action
        title="Copy Developer"
        icon={Icon.Clipboard}
        onAction={() => copyToClipboard(app.sellerName || "Unknown Developer", "Developer")}
      />
      <Action
        title="Copy App Store URL"
        icon={Icon.Link}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        onAction={() => copyToClipboard(appStoreUrl, "App Store URL")}
      />
      {app.artistViewUrl && (
        <Action
          title="Copy Developer URL"
          icon={Icon.Link}
          onAction={() => copyToClipboard(app.artistViewUrl!, "Developer URL")}
        />
      )}
    </ActionPanel.Section>
  );
}
