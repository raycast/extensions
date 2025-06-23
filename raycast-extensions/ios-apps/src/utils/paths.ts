import { homedir } from "os";
import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences } from "../types";

// Get preferences
export const preferences = getPreferenceValues<ExtensionPreferences>();

// Define the path to ipatool, using the preference if available
export const IPATOOL_PATH = preferences.ipatoolPath || "/opt/homebrew/bin/ipatool";

// Get the downloads directory path from preferences or default to ~/Downloads
export function getDownloadsDirectory(): string {
  if (preferences.downloadPath) {
    // Replace ~ with the actual home directory if present
    if (preferences.downloadPath.startsWith("~")) {
      return preferences.downloadPath.replace("~", homedir());
    }
    return preferences.downloadPath;
  }

  return `${homedir()}/Downloads`;
}

// Format price to display "Free" instead of "0"
export function formatPrice(price: string): string {
  return price === "0" ? "Free" : `$${price}`;
}
