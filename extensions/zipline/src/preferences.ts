import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  serverUrl: string;
  apiToken: string;
  defaultExpiry: string;
  filenameFormat: string;
  defaultFolder: string;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getServerUrl(): string {
  const { serverUrl } = getPreferences();
  return serverUrl.replace(/\/+$/, "");
}
