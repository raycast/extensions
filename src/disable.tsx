import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { PiHoleAPI } from "./api/pihole";
import { getPreferences } from "./utils/preferences";

export default async function DisableCommand() {
  const preferences = getPreferences();
  const api = new PiHoleAPI(preferences.piholeUrl, preferences.apiToken);

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Disabling Pi-hole...",
    });

    await api.disable();

    await showToast({
      style: Toast.Style.Success,
      title: "Pi-hole Disabled",
      message: "DNS blocking is now inactive",
    });

    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Disable Pi-hole",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
