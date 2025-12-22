import { environment } from "@raycast/api";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, statSync } from "fs";

// Constants
const FAVICON_CACHE_DIR = join(environment.supportPath, "favicons");
const FAVICON_SIZE = 64;
// Minimum valid favicon size in bytes (filter out empty/placeholder images)
// Google's default "no favicon" globe icon is ~500 bytes, real favicons are typically larger
const MIN_FAVICON_SIZE = 100;
// Fetch timeout in milliseconds (short since we race multiple sources)
const FETCH_TIMEOUT = 2000;

// Favicon service URLs - all raced in parallel, fastest wins
// Quality preference: Site direct > Google > Apple > others
const FAVICON_SOURCES = {
  // Direct from site - most authoritative
  directFavicon: (hostname: string) => `https://${hostname}/favicon.ico`,
  // Google's favicon service - fast CDN, reliable, good coverage
  google: (hostname: string) =>
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${FAVICON_SIZE}`,
  // Apple touch icon - often higher quality (128x128+)
  appleTouchIcon: (hostname: string) => `https://${hostname}/apple-touch-icon.png`,
  // DuckDuckGo - privacy-focused alternative
  duckduckgo: (hostname: string) => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`,
  // Icon Horse - aggregates multiple sources
  iconHorse: (hostname: string) => `https://icon.horse/icon/${encodeURIComponent(hostname)}`,
  // Yandex - good for international sites
  yandex: (hostname: string) => `https://favicon.yandex.net/favicon/${encodeURIComponent(hostname)}`,
};

// Cache directory initialization (lazy, only once)
let cacheInitialized = false;
function ensureCacheDir(): void {
  if (cacheInitialized) return;
  if (!existsSync(FAVICON_CACHE_DIR)) {
    mkdirSync(FAVICON_CACHE_DIR, { recursive: true });
  }
  cacheInitialized = true;
}

/**
 * Parse URL safely, returns undefined if invalid
 */
function parseUrl(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

/**
 * Generate a safe filename from a hostname
 */
function hostnameToFilename(hostname: string): string {
  return `${hostname.replace(/[^a-zA-Z0-9.-]/g, "_")}.png`;
}

/**
 * Get the cached favicon path for a URL
 */
export function getFaviconCachePath(url: string): string {
  ensureCacheDir();
  const parsed = parseUrl(url);
  const filename = parsed ? hostnameToFilename(parsed.hostname) : `fallback_${Date.now()}.png`;
  return join(FAVICON_CACHE_DIR, filename);
}

/**
 * Check if a file path points to a valid favicon (exists and has content)
 */
export function isValidFaviconPath(path: string | undefined): boolean {
  if (!path) return false;
  try {
    if (!existsSync(path)) return false;
    const stats = statSync(path);
    return stats.size >= MIN_FAVICON_SIZE;
  } catch {
    return false;
  }
}

/**
 * Get cached favicon as a file path if it exists and is valid
 */
export function getCachedFavicon(url: string): string | undefined {
  const cachePath = getFaviconCachePath(url);
  return isValidFaviconPath(cachePath) ? cachePath : undefined;
}

/**
 * Try to fetch a favicon from a specific URL with timeout
 * Returns the buffer if successful and valid, throws otherwise
 */
async function tryFetchFavicon(faviconUrl: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(faviconUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Validate buffer has actual content (not just a placeholder)
    if (buffer.length < MIN_FAVICON_SIZE) {
      throw new Error("Favicon too small");
    }

    return buffer;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Race all favicon sources in parallel, return first successful result
 * Uses Promise.any to get the first fulfilled promise
 */
async function fetchFirstSuccessfulFavicon(hostname: string): Promise<Buffer | undefined> {
  const sources = [
    FAVICON_SOURCES.directFavicon(hostname),
    FAVICON_SOURCES.google(hostname),
    FAVICON_SOURCES.appleTouchIcon(hostname),
    FAVICON_SOURCES.duckduckgo(hostname),
    FAVICON_SOURCES.iconHorse(hostname),
    FAVICON_SOURCES.yandex(hostname),
  ];

  try {
    // Promise.any returns the first fulfilled promise, ignores rejections
    // All requests run in parallel - total time = fastest successful request
    return await Promise.any(sources.map((url) => tryFetchFavicon(url)));
  } catch {
    // AggregateError: all promises rejected = no favicon found
    return undefined;
  }
}

/**
 * Fetch and cache a favicon for a URL
 * Tries all sources in parallel, uses first successful response
 * Returns undefined if no valid favicon found from any source
 * @param url - The website URL to fetch favicon for
 * @param forceRefresh - If true, bypasses cache and fetches fresh
 */
export async function fetchAndCacheFavicon(url: string, forceRefresh = false): Promise<string | undefined> {
  try {
    // Return cached version unless force refresh requested
    if (!forceRefresh) {
      const existingPath = getCachedFavicon(url);
      if (existingPath) return existingPath;
    }

    const parsed = parseUrl(url);
    if (!parsed) return undefined;

    const buffer = await fetchFirstSuccessfulFavicon(parsed.hostname);

    if (buffer) {
      const cachePath = getFaviconCachePath(url);
      writeFileSync(cachePath, buffer);
      return cachePath;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract domain/hostname from URL for display
 */
export function extractDomain(url: string): string {
  const parsed = parseUrl(url);
  return parsed ? parsed.hostname.replace(/^www\./, "") : url;
}

/**
 * Validate if a string is a valid HTTP(S) URL
 */
export function isValidUrl(url: string): boolean {
  const parsed = parseUrl(url);
  return parsed ? parsed.protocol === "http:" || parsed.protocol === "https:" : false;
}

/**
 * Convert "dot" text to actual dots in URLs
 * Handles: discorddotcom → discord.com, jadotmt → ja.mt, githubdotcodotuk → github.co.uk
 */
function convertDotText(input: string): string {
  // Match "dot" surrounded by alphanumeric characters (case-insensitive)
  // This converts "discorddotcom" → "discord.com" but won't break actual words
  return input.replace(/([a-z0-9])dot([a-z0-9])/gi, "$1.$2");
}

/**
 * Normalize a URL (convert "dot" to ".", add https if missing, trim whitespace)
 * Examples:
 *   - discorddotcom → https://discord.com
 *   - jadotmt → https://ja.mt
 *   - githubdotcodotuk → https://github.co.uk
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Convert "dot" text to actual dots
  const withDots = convertDotText(trimmed);

  // Add https:// if no protocol present
  return withDots.match(/^https?:\/\//i) ? withDots : `https://${withDots}`;
}

/**
 * Fetch the title of a webpage
 * Returns the page title or falls back to domain name
 */
export async function fetchWebsiteTitle(url: string): Promise<string> {
  const fallback = extractDomain(url);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return fallback;

    const html = await response.text();

    // Try to extract title from <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      const title = titleMatch[1].trim();
      // Clean up common suffixes and decode HTML entities
      const cleanTitle = title
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");

      // Return title if it's not empty and not just the domain
      if (cleanTitle && cleanTitle.toLowerCase() !== fallback.toLowerCase()) {
        return cleanTitle;
      }
    }

    return fallback;
  } catch {
    return fallback;
  }
}
