import { LaunchType, Toast, environment, getPreferenceValues, showToast, updateCommandMetadata } from "@raycast/api";
import { cacheSnapshot, fetchAccountSnapshot, formatCommandSubtitle, getErrorMessage } from "./zenmux";

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences.UsageStatus>();
    const snapshot = await fetchAccountSnapshot();
    cacheSnapshot(snapshot);

    const subtitle = formatCommandSubtitle(snapshot, preferences.statusDisplay);
    await updateCommandMetadata({ subtitle });

    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast({
        style: Toast.Style.Success,
        title: "ZenMux usage refreshed",
        message: subtitle,
      });
    }
  } catch (error) {
    const message = getErrorMessage(error);
    await updateCommandMetadata({ subtitle: "Refresh failed" });

    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not refresh ZenMux usage",
        message,
      });
    }
  }
}
