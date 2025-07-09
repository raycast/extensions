import { PiHoleAPI } from "../api/pihole";
import { getPreferences } from "./preferences";

let apiInstance: PiHoleAPI | null = null;

export function getPiHoleAPI(): PiHoleAPI {
  if (!apiInstance) {
    const preferences = getPreferences();
    apiInstance = new PiHoleAPI(preferences.piholeUrl, preferences.apiToken);
  }
  return apiInstance;
}

// Reset the singleton (useful for tests or when preferences change)
export function resetPiHoleAPI(): void {
  apiInstance = null;
}
