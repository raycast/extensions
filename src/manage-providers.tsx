import { openExtensionPreferences } from "@raycast/api";

export default function Command() {
  // Immediately open extension preferences
  openExtensionPreferences();
  return null;
}
