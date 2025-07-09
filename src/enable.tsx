import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { PiHoleAPI } from "./api/pihole";
import { getPreferences } from "./utils/preferences";

export default async function EnableCommand() {
  const preferences = getPreferences();
  const api = new PiHoleAPI(preferences.piholeUrl, preferences.apiToken);

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Enabling Pi-hole...",
    });

    await api.enable();

    await showToast({
      style: Toast.Style.Success,
      title: "Pi-hole Enabled",
      message: "DNS blocking is now active",
    });

    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Enable Pi-hole",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
