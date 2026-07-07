import { getPreferenceValues } from "@raycast/api";

export function getAppPreferences(): Preferences.Yr {
  return getPreferenceValues<Preferences.Yr>();
}
