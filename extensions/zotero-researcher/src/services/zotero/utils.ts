import { ZoteroItem, ZoteroCollection } from "../../types/zoteroItems";

/**
 * Base URL for the Zotero API
 */
export const ZOTERO_API_BASE_URL = "https://api.zotero.org";

/**
 * Build a URL for accessing a user's library
 * @param userId The Zotero user ID
 * @returns The API URL for the user's library
 */
export function buildUserLibraryUrl(userId: string): string {
  // Ensure the user ID is clean and valid
  const sanitizedUserId = userId.trim();
  if (!sanitizedUserId) {
    throw new Error("User ID cannot be empty");
  }

  console.log(`Building URL for user ID: ${sanitizedUserId}`);
  const url = `${ZOTERO_API_BASE_URL}/users/${sanitizedUserId}/items`;
  console.log(`Built URL: ${url}`);
  return url;
}

/**
 * Build a URL for accessing a group's library
 * @param groupId The Zotero group ID
 * @returns The API URL for the group's library
 */
export function buildGroupLibraryUrl(groupId: string): string {
  return `${ZOTERO_API_BASE_URL}/groups/${groupId}/items`;
}

/**
 * Convert search parameters to URL query parameters
 * @param params The search parameters
 * @returns A query string for use in API requests
 */
export function buildSearchQueryString(
  params: Record<string, string | number | boolean | string[]>,
): string {
  const queryParams = new URLSearchParams();

  // Add each parameter to the query string
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach((v) => queryParams.append(key, v.toString()));
    } else {
      queryParams.set(key, value.toString());
    }
  });

  return queryParams.toString();
}

/**
 * Format a date in the ISO 8601 format expected by Zotero
 * @param date The date to format
 * @returns The formatted date string
 */
export function formatZoteroDate(date: Date): string {
  return date.toISOString();
}

/**
 * Parse a Zotero date string into a Date object
 * @param dateString The Zotero date string
 * @returns A Date object
 */
export function parseZoteroDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Simple response parser placeholder
 */
export function parseResponse<T extends ZoteroItem | ZoteroCollection>(): {
  items: T[];
  totalResults: number;
} {
  return {
    items: [],
    totalResults: 0,
  };
}
