import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  apiKey: string;
  userId: string;
}

/**
 * Validate a Zotero API key
 * @param apiKey The API key to validate
 * @returns true if the API key is valid, false otherwise
 */
export function isValidApiKey(apiKey: string): boolean {
  return /^[a-zA-Z0-9]{24}$/.test(apiKey);
}

/**
 * Validate a Zotero user ID
 * @param userId The user ID to validate
 * @returns true if the user ID is valid, false otherwise
 */
export function isValidUserId(userId: string): boolean {
  // Accept either numeric IDs or username format
  return /^\d+$/.test(userId) || /^[a-zA-Z0-9_-]+$/.test(userId);
}

/**
 * Get the user's preferences with validation
 * @returns The validated preferences
 * @throws Error if preferences are invalid
 */
export function getZoteroPreferences(): Preferences {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiKey) {
    throw new Error(
      "Zotero API key is required. Get one from https://www.zotero.org/settings/keys",
    );
  }

  if (!isValidApiKey(preferences.apiKey)) {
    throw new Error(
      "Invalid Zotero API key. It should be 24 characters long and contain only letters and numbers.",
    );
  }

  if (!preferences.userId) {
    throw new Error(
      "Zotero user ID is required. Find it in your profile URL (e.g., https://www.zotero.org/johndoe -> 'johndoe' is your user ID)",
    );
  }

  if (!isValidUserId(preferences.userId)) {
    throw new Error(
      "Invalid Zotero user ID. It should contain only letters, numbers, underscores, and hyphens.",
    );
  }

  return preferences;
}
