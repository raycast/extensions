import { getPreferenceValues } from "@raycast/api";

export type AppPreferences = {
  units?: "metric" | "imperial";
  showWindDirection?: boolean;
  showSunTimes?: boolean;
  clockFormat?: "12h" | "24h";
  debugMode?: boolean;
};

export function getAppPreferences(): AppPreferences {
  return getPreferenceValues<AppPreferences>();
}
