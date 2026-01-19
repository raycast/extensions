import { Application, showToast, Toast, confirmAlert } from "@raycast/api";
import { Folder, FolderItem } from "./types";
import { createWebsiteItem } from "./utils";
import { normalizeUrl, isValidUrl, fetchWebsiteTitle, extractDomain } from "./favicon";

// Shared content type for both forms
export type ContentType = "applications" | "websites" | "folders";

// Type-safe item filtering helpers (single source of truth)
export const filterWebsites = (items: FolderItem[]): Array<FolderItem & { url: string }> =>
  items.filter((i): i is FolderItem & { url: string } => i.type === "website" && !!i.url);

export const filterApplications = (items: FolderItem[]): Array<FolderItem & { path: string }> =>
  items.filter((i): i is FolderItem & { path: string } => i.type === "application" && !!i.path);

export const filterFolders = (items: FolderItem[]): Array<FolderItem & { folderId: string }> =>
  items.filter((i): i is FolderItem & { folderId: string } => i.type === "folder" && !!i.folderId);

/**
 * Create a Map for O(1) folder lookups by ID
 * Use this instead of repeated folders.find() calls
 */
export function createFolderMap(folders: Folder[]): Map<string, Folder> {
  return new Map(folders.map((f) => [f.id, f]));
}

/**
 * Create a Map for O(1) website lookups by normalized URL
 * Use this instead of repeated filterWebsites + find calls
 */
export function createWebsiteUrlMap(items: FolderItem[]): Map<string, FolderItem & { url: string }> {
  return new Map(filterWebsites(items).map((w) => [normalizeUrl(w.url), w]));
}

/**
 * Separate items into duplicates and new items based on a Set of existing values
 * Generic helper to reduce duplicate filtering logic
 */
export function separateDuplicates<T>(items: T[], existingSet: Set<T>): { duplicates: T[]; new: T[] } {
  return {
    duplicates: items.filter((item) => existingSet.has(item)),
    new: items.filter((item) => !existingSet.has(item)),
  };
}

/**
 * Find all folder IDs that are nested within other folders (have a parent)
 * Returns a Set for O(1) lookups
 */
export function getNestedFolderIds(folders: Folder[]): Set<string> {
  const nested = new Set<string>();
  for (const folder of folders) {
    for (const item of folder.items) {
      if (item.type === "folder" && item.folderId) {
        nested.add(item.folderId);
      }
    }
  }
  return nested;
}

/**
 * Find folders that are nested with their parent ID
 * Returns a Map for O(1) lookups: folderId -> parentFolderId
 */
export function getFolderParentMap(folders: Folder[]): Map<string, string> {
  const parentMap = new Map<string, string>();
  for (const folder of folders) {
    for (const item of folder.items) {
      if (item.type === "folder" && item.folderId) {
        parentMap.set(item.folderId, folder.id);
      }
    }
  }
  return parentMap;
}

/**
 * Parsed URL entry with optional custom title
 */
export interface ParsedUrlEntry {
  url: string;
  title?: string; // Custom title from markdown syntax
}

/**
 * Regex to match markdown link syntax: [title](url)
 */
const MARKDOWN_LINK_REGEX = /^\[([^\]]+)\]\(([^)]+)\)$/;

/**
 * Parse a single line that may be a URL or markdown link
 * Returns the URL and optional title
 */
function parseUrlLine(line: string): ParsedUrlEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Try markdown syntax first: [title](url)
  const match = trimmed.match(MARKDOWN_LINK_REGEX);
  if (match) {
    const title = match[1].trim();
    const url = normalizeUrl(match[2].trim());
    if (isValidUrl(url)) {
      return { url, title: title || undefined };
    }
  }

  // Fall back to plain URL
  const url = normalizeUrl(trimmed);
  if (isValidUrl(url)) {
    return { url };
  }

  return null;
}

/**
 * Parse website URLs from a multiline string
 * Supports both plain URLs and markdown link syntax [title](url)
 * Returns normalized, validated URLs
 */
export function parseWebsiteUrls(input: string): string[] {
  return parseWebsiteUrlsWithTitles(input).map((entry) => entry.url);
}

/**
 * Parse website URLs with optional titles from a multiline string
 * Supports markdown link syntax: [Custom Title](https://example.com)
 * Returns normalized, validated URL entries with optional titles
 */
export function parseWebsiteUrlsWithTitles(input: string): ParsedUrlEntry[] {
  if (!input?.trim()) return [];

  return input
    .split("\n")
    .map((line) => parseUrlLine(line))
    .filter((entry): entry is ParsedUrlEntry => entry !== null);
}

/**
 * Validate website URLs input
 * Supports both plain URLs and markdown link syntax [title](url)
 * Returns error message or undefined if valid
 * Compatible with Raycast form validation signature
 */
export function validateWebsiteUrls(input: string | undefined): string | undefined {
  if (!input?.trim()) return undefined;

  const lines = input.split("\n").filter((line) => line.trim());
  for (const line of lines) {
    const trimmed = line.trim();

    // Check for markdown syntax
    const match = trimmed.match(MARKDOWN_LINK_REGEX);
    if (match) {
      const url = normalizeUrl(match[2].trim());
      if (!isValidUrl(url)) {
        return `Invalid URL in: ${trimmed}`;
      }
      continue;
    }

    // Plain URL
    const normalized = normalizeUrl(trimmed);
    if (!isValidUrl(normalized)) {
      return `Invalid URL: ${trimmed}`;
    }
  }
  return undefined;
}

/**
 * Find duplicate URLs that already exist in the folder
 * Returns the list of duplicate URLs with their display names
 */
export function findDuplicateUrls(urlInput: string, existingItems: FolderItem[]): { url: string; name: string }[] {
  const urlLines = parseWebsiteUrls(urlInput);
  if (urlLines.length === 0) return [];

  const existingByUrl = createWebsiteUrlMap(existingItems);

  // Find duplicates
  return urlLines.filter((url) => existingByUrl.has(url)).map((url) => ({ url, name: existingByUrl.get(url)!.name }));
}

export interface DuplicateInfo {
  name: string;
  type?: string;
}

/**
 * Generic confirmation dialog for duplicates
 * Returns true if user wants to add duplicates, false otherwise
 */
export async function confirmDuplicates(
  duplicates: DuplicateInfo[],
  options: {
    title?: string;
    itemType?: string;
    addAction?: string;
    skipAction?: string;
  } = {},
): Promise<boolean> {
  if (duplicates.length === 0) return true;

  const {
    title = "Duplicate Items Found",
    itemType = "item",
    addAction = "Add Duplicates",
    skipAction = "Skip Duplicates",
  } = options;

  const duplicateList = duplicates.map((d) => (d.type ? `• ${d.name} (${d.type})` : `• ${d.name}`)).join("\n");

  const itemWord = duplicates.length === 1 ? itemType : `${itemType}s`;
  const message =
    duplicates.length === 1
      ? `This ${itemType} already exists in the folder:\n\n${duplicateList}`
      : `These ${duplicates.length} ${itemWord} already exist in the folder:\n\n${duplicateList}`;

  return confirmAlert({
    title,
    message,
    primaryAction: { title: addAction },
    dismissAction: { title: skipAction },
  });
}

/**
 * Show confirmation dialog for duplicate URLs
 * Returns true if user wants to add duplicates, false otherwise
 */
export async function confirmDuplicateUrls(duplicates: { url: string; name: string }[]): Promise<boolean> {
  return confirmDuplicates(
    duplicates.map((d) => ({ name: d.name })),
    { title: "Duplicate Websites Found", itemType: "website" },
  );
}

/**
 * Process website URLs and create FolderItems
 * Supports markdown link syntax for custom titles: [Custom Title](https://example.com)
 * Reuses existing items when possible to preserve names
 * Fetches page titles for new URLs (unless custom title provided)
 * Favicons are fetched dynamically via @raycast/utils getFavicon
 * @param urlInput - Multiline string of URLs or markdown links
 * @param existingItems - Existing items in the folder
 * @param includeDuplicates - Whether to include duplicate URLs (default: true)
 */
export async function processWebsiteUrls(
  urlInput: string,
  existingItems: FolderItem[] = [],
  includeDuplicates = true,
): Promise<FolderItem[]> {
  const urlEntries = parseWebsiteUrlsWithTitles(urlInput);
  if (urlEntries.length === 0) return [];

  const existingByUrl = createWebsiteUrlMap(existingItems);

  // Determine which entries to process
  const entriesToProcess = includeDuplicates ? urlEntries : urlEntries.filter((entry) => !existingByUrl.has(entry.url));

  if (entriesToProcess.length === 0) return [];

  // Count new URLs that need title fetching (not in existing items AND no custom title)
  const urlsNeedingFetch = entriesToProcess.filter((entry) => !existingByUrl.has(entry.url) && !entry.title);

  if (urlsNeedingFetch.length > 0) {
    await showToast({
      style: Toast.Style.Animated,
      title: `Fetching ${urlsNeedingFetch.length} website${urlsNeedingFetch.length > 1 ? "s" : ""}...`,
    });
  }

  // Process all entries - reuse existing or create new
  const items: FolderItem[] = [];
  for (const entry of entriesToProcess) {
    const existing = existingByUrl.get(entry.url);
    if (existing && !entry.title) {
      // For duplicates without custom title, create a new item (copy) with a new ID
      items.push(createWebsiteItem(entry.url, existing.name));
    } else if (entry.title) {
      // Custom title provided via markdown syntax
      items.push(createWebsiteItem(entry.url, entry.title));
    } else {
      // Fetch title for new URLs (favicons handled by getFavicon at render time)
      const title = await fetchWebsiteTitle(entry.url);
      items.push(createWebsiteItem(entry.url, title));
    }
  }

  return items;
}

/**
 * Extract website URLs from folder items as a multiline string
 * Uses markdown syntax [title](url) for items with custom titles
 * Uses plain URL for items where the name matches the domain
 */
export function extractWebsiteUrls(items: FolderItem[]): string {
  return filterWebsites(items)
    .map((item) => {
      const domain = extractDomain(item.url);
      // If name differs from domain, use markdown syntax to preserve custom title
      if (item.name && item.name !== domain) {
        return `[${item.name}](${item.url})`;
      }
      return item.url;
    })
    .join("\n");
}

/**
 * Extract application paths from folder items
 */
export function extractAppPaths(items: FolderItem[], applications: Application[]): string[] {
  return filterApplications(items).map((i) => {
    const app = applications.find((a) => a.path === i.path || a.name === i.path || a.bundleId === i.path);
    return app?.path || i.path;
  });
}

/**
 * Extract nested folder IDs from folder items
 */
export function extractFolderIds(items: FolderItem[]): string[] {
  return filterFolders(items).map((i) => i.folderId);
}
