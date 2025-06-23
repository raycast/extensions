// App Store web scraper utility functions
import nodeFetch from "node-fetch";
import { AppDetails } from "../types";

/**
 * Screenshot information
 */
export interface ScreenshotInfo {
  url: string;
  type: "iPhone" | "iPad" | "Mac" | "AppleTV";
  index: number;
}

/**
 * Get the App Store URL for an app
 * @param app App details
 * @returns App Store URL
 */
export function getAppStoreUrl(app: AppDetails): string {
  // Use the trackViewUrl if available, otherwise construct from app ID
  return app.trackViewUrl || `https://apps.apple.com/us/app/id${app.id}`;
}

/**
 * Extract high-resolution screenshot URLs from App Store website
 * @param app App details
 * @returns Array of screenshot information objects
 */
export async function scrapeAppStoreScreenshots(app: AppDetails): Promise<ScreenshotInfo[]> {
  try {
    console.log(`[Scraper] Scraping screenshots for ${app.name} (${app.bundleId})`);
    const appStoreUrl = getAppStoreUrl(app);

    // Fetch the App Store page
    console.log(`[Scraper] Fetching page: ${appStoreUrl}`);
    const response = await nodeFetch(appStoreUrl);

    if (!response.ok) {
      console.error(`[Scraper] Failed to fetch App Store page: ${response.status} ${response.statusText}`);
      return [];
    }

    const html = await response.text();

    // Extract screenshot URLs using regex patterns
    const screenshotsMap = new Map<string, ScreenshotInfo>();

    // First, try to find all we-artwork elements which contain the screenshots
    // These are the actual screenshot images in the App Store page
    console.log("[Scraper] Looking for we-artwork elements");
    const weArtworkRegex = /<picture[^>]*class="[^"]*we-artwork[^"]*"[^>]*>([\s\S]*?)<\/picture>/g;
    let artworkMatch;
    let index = 0;

    // Track which device type we're currently processing
    let currentDeviceType: "iPhone" | "iPad" | "Mac" | "AppleTV" = "iPhone";

    // Look for device type indicators in the HTML
    if (html.includes("we-screenshot-viewer__screenshots--ipad")) {
      currentDeviceType = "iPad";
    } else if (html.includes("we-screenshot-viewer__screenshots--mac")) {
      currentDeviceType = "Mac";
    } else if (html.includes("we-screenshot-viewer__screenshots--apple-tv")) {
      currentDeviceType = "AppleTV";
    }

    // Process all we-artwork elements
    while ((artworkMatch = weArtworkRegex.exec(html)) !== null) {
      const artworkHtml = artworkMatch[1];
      const srcsetMatch = artworkHtml.match(/srcset="([^"]+)"/i);

      if (srcsetMatch && srcsetMatch[1]) {
        const srcset = srcsetMatch[1];
        const highResUrl = extractHighestResolutionUrl(srcset);

        // Check if this is a screenshot and not an icon
        if (highResUrl && isAppStoreScreenshot(highResUrl)) {
          const normalizedUrl = normalizeUrl(highResUrl);

          // Only add if we don't already have this screenshot
          if (!screenshotsMap.has(normalizedUrl)) {
            // Determine device type based on context or parent elements
            let deviceType = currentDeviceType;

            // Check if we can determine device type from the HTML context
            const contextHtml = html.substring(
              Math.max(0, artworkMatch.index - 500),
              Math.min(html.length, artworkMatch.index + 500),
            );

            if (contextHtml.includes("we-screenshot-viewer__screenshots--iphone")) {
              deviceType = "iPhone";
            } else if (contextHtml.includes("we-screenshot-viewer__screenshots--ipad")) {
              deviceType = "iPad";
            } else if (contextHtml.includes("we-screenshot-viewer__screenshots--mac")) {
              deviceType = "Mac";
            } else if (contextHtml.includes("we-screenshot-viewer__screenshots--apple-tv")) {
              deviceType = "AppleTV";
            }

            screenshotsMap.set(normalizedUrl, {
              url: highResUrl,
              type: deviceType,
              index: index++,
            });
          }
        }
      }
    }

    // If we didn't find any screenshots with we-artwork, try the screenshot viewer approach
    if (screenshotsMap.size === 0) {
      console.log("[Scraper] No screenshots found with we-artwork, trying screenshot viewer section");

      // Try to find the screenshot viewer section
      const screenshotViewerRegex = /<section[^>]*class="[^"]*we-screenshot-viewer[^"]*"[^>]*>([\s\S]*?)<\/section>/i;
      const screenshotViewerMatch = screenshotViewerRegex.exec(html);

      if (screenshotViewerMatch && screenshotViewerMatch[1]) {
        const screenshotViewerHtml = screenshotViewerMatch[1];
        console.log("[Scraper] Found screenshot viewer section");

        // Find iPhone screenshots
        const iphoneScreenshots = extractScreenshotsByRegex(
          screenshotViewerHtml,
          /we-screenshot-viewer__screenshots--iphone[^>]*>([\s\S]*?)(?:<\/div>|<div class="we-screenshot-viewer__screenshots)/,
          "iPhone",
        );
        addUniqueScreenshots(screenshotsMap, iphoneScreenshots);

        // Find iPad screenshots
        const ipadScreenshots = extractScreenshotsByRegex(
          screenshotViewerHtml,
          /we-screenshot-viewer__screenshots--ipad[^>]*>([\s\S]*?)(?:<\/div>|<div class="we-screenshot-viewer__screenshots)/,
          "iPad",
        );
        addUniqueScreenshots(screenshotsMap, ipadScreenshots);

        // Find Mac screenshots
        const macScreenshots = extractScreenshotsByRegex(
          screenshotViewerHtml,
          /we-screenshot-viewer__screenshots--mac[^>]*>([\s\S]*?)(?:<\/div>|<div class="we-screenshot-viewer__screenshots)/,
          "Mac",
        );
        addUniqueScreenshots(screenshotsMap, macScreenshots);

        // Find Apple TV screenshots
        const tvScreenshots = extractScreenshotsByRegex(
          screenshotViewerHtml,
          /we-screenshot-viewer__screenshots--apple-tv[^>]*>([\s\S]*?)(?:<\/div>|<div class="we-screenshot-viewer__screenshots)/,
          "AppleTV",
        );
        addUniqueScreenshots(screenshotsMap, tvScreenshots);
      }
    }

    // If still no screenshots found, try a more general approach as a last resort
    if (screenshotsMap.size === 0) {
      console.log("[Scraper] No screenshots found with specific selectors, trying general approach");

      // Look for any srcset attributes in the HTML within we-screenshot class elements
      const weScreenshotRegex = /<div[^>]*class="[^"]*we-screenshot[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
      let match;
      let index = 0;

      while ((match = weScreenshotRegex.exec(html)) !== null) {
        const screenshotHtml = match[1];
        const srcsetMatch = screenshotHtml.match(/srcset="([^"]+)"/i);

        if (srcsetMatch && srcsetMatch[1]) {
          const srcset = srcsetMatch[1];
          const highResUrl = extractHighestResolutionUrl(srcset);

          if (highResUrl && isAppStoreScreenshot(highResUrl)) {
            const normalizedUrl = normalizeUrl(highResUrl);

            if (!screenshotsMap.has(normalizedUrl)) {
              screenshotsMap.set(normalizedUrl, {
                url: highResUrl,
                type: "iPhone", // Default to iPhone if we can't determine the type
                index: index++,
              });
            }
          }
        }
      }
    }

    // Convert the Map values to an array
    const uniqueScreenshots = Array.from(screenshotsMap.values());

    // Reindex the screenshots to ensure sequential indices
    const deviceTypes = ["iPhone", "iPad", "Mac", "AppleTV"];
    const reindexedScreenshots: ScreenshotInfo[] = [];

    // Process each device type separately to maintain device-specific indices
    for (const deviceType of deviceTypes) {
      const deviceScreenshots = uniqueScreenshots.filter((s) => s.type === deviceType);
      deviceScreenshots.forEach((screenshot, idx) => {
        reindexedScreenshots.push({
          ...screenshot,
          index: idx,
        });
      });
    }

    console.log(
      `[Scraper] Found ${reindexedScreenshots.length} unique screenshots (filtered from ${uniqueScreenshots.length} total)`,
    );
    return reindexedScreenshots;
  } catch (error) {
    console.error("[Scraper] Error scraping App Store:", error);
    return [];
  }
}

/**
 * Add unique screenshots to the map, avoiding duplicates
 * @param screenshotsMap Map of normalized URLs to screenshot info
 * @param newScreenshots Array of new screenshots to add
 */
function addUniqueScreenshots(screenshotsMap: Map<string, ScreenshotInfo>, newScreenshots: ScreenshotInfo[]): void {
  for (const screenshot of newScreenshots) {
    // Generate a normalized URL for deduplication
    const normalizedUrl = normalizeUrl(screenshot.url);

    // Only add if we don't already have this screenshot
    if (!screenshotsMap.has(normalizedUrl)) {
      screenshotsMap.set(normalizedUrl, screenshot);
    }
  }
}

/**
 * Normalize a URL for deduplication purposes
 * @param url URL to normalize
 * @returns Normalized URL string
 */
function normalizeUrl(url: string): string {
  // Extract the base part of the URL (before the resolution)
  const basePart = url.substring(0, url.lastIndexOf("/") + 1);

  // Remove any resolution and file extension info for comparison
  // This helps identify duplicates even if they have different resolutions or formats
  return basePart;
}

/**
 * Extract screenshots from HTML using regex
 * @param html HTML content
 * @param regex Regex pattern to match the section
 * @param type Device type
 * @returns Array of screenshot information objects
 */
function extractScreenshotsByRegex(
  html: string,
  regex: RegExp,
  type: "iPhone" | "iPad" | "Mac" | "AppleTV",
): ScreenshotInfo[] {
  const screenshots: ScreenshotInfo[] = [];
  const sectionMatch = regex.exec(html);

  if (sectionMatch && sectionMatch[1]) {
    const section = sectionMatch[1];
    const srcsetRegex = /srcset="([^"]+)"/g;
    let match;
    let index = 0;

    while ((match = srcsetRegex.exec(section)) !== null) {
      const srcset = match[1];
      const highResUrl = extractHighestResolutionUrl(srcset);

      if (highResUrl && isAppStoreScreenshot(highResUrl)) {
        screenshots.push({
          url: highResUrl,
          type,
          index: index++,
        });
      }
    }

    console.log(`[Scraper] Found ${screenshots.length} ${type} screenshots`);
  }

  return screenshots;
}

/**
 * Check if a URL is likely an App Store screenshot
 * @param url URL to check
 * @returns True if the URL appears to be an App Store screenshot
 */
function isAppStoreScreenshot(url: string): boolean {
  // App Store screenshots typically come from mzstatic.com domain
  if (!url.includes("mzstatic.com") || !url.includes("image/thumb")) {
    return false;
  }

  // Filter out app icons (they typically have "app-icon" in the URL)
  if (url.includes("app-icon") || url.includes("icon_")) {
    return false;
  }

  // Filter out promotional images that aren't screenshots
  if (url.includes("landing-") || url.includes("poster-")) {
    return false;
  }

  // Filter out square logos/icons (they typically have dimensions like 512x512, 1024x1024)
  if (url.includes("x0w.") === false && url.match(/\d+x\d+/)) {
    const dimensions = url.match(/(\d+)x(\d+)/);
    if (dimensions && dimensions[1] === dimensions[2]) {
      // It's a square image, likely an icon or logo, not a screenshot
      return false;
    }
  }

  // Accept images that look like screenshots
  if (url.includes("/screenshot/") || url.includes("x0w.") || url.includes("x0h.")) {
    return true;
  }

  // For we-artwork elements, be more permissive but still filter out obvious non-screenshots
  return !url.includes("1x1") && !url.includes("icon");
}

/**
 * Extract the highest resolution URL from a srcset attribute
 * @param srcset srcset attribute value
 * @returns Highest resolution URL or null if none found
 */
function extractHighestResolutionUrl(srcset: string): string | null {
  // If it's a simple URL without srcset format, return it directly
  if (!srcset.includes(" ")) {
    return srcset;
  }

  // Parse the srcset format: "url1 1x, url2 2x, url3 3x"
  const sources = srcset.split(",").map((src) => {
    const [url, descriptor] = src.trim().split(" ");
    // Extract the density multiplier (1x, 2x, 3x, etc.)
    const density = descriptor ? parseFloat(descriptor.replace("x", "")) : 1;
    return { url, density };
  });

  // Sort by density in descending order and get the highest resolution URL
  sources.sort((a, b) => b.density - a.density);

  // Convert to full URL if it's a relative path
  let highResUrl = sources[0]?.url;

  // If the URL is relative, make it absolute
  if (highResUrl && highResUrl.startsWith("/")) {
    highResUrl = `https://apps.apple.com${highResUrl}`;
  }

  return highResUrl || null;
}

/**
 * Transform App Store URLs to get original/highest resolution images
 * @param url Screenshot URL from the App Store
 * @returns URL to the highest resolution version
 */
export function getHighestResolutionUrl(url: string): string {
  // The App Store often uses URLs like:
  // https://is1-ssl.mzstatic.com/image/thumb/PurpleSource126/v4/aa/bb/cc/aabbcc-image.png/230x0w.webp

  // We want to transform it to:
  // https://is1-ssl.mzstatic.com/image/thumb/PurpleSource126/v4/aa/bb/cc/aabbcc-image.png/2000x0w.png

  try {
    // Check if this is an App Store image URL
    if (url.includes("mzstatic.com/image/thumb/")) {
      // Extract the base part of the URL (before the resolution)
      const basePart = url.substring(0, url.lastIndexOf("/") + 1);

      // Always use PNG format for highest quality
      // This prioritizes PNG over WebP as requested
      const fileExt = "png";

      // Return the URL with the highest resolution
      return `${basePart}2000x0w.${fileExt}`;
    }

    // If not an App Store URL or doesn't match the expected format, return as is
    return url;
  } catch (error) {
    console.error("[Scraper] Error transforming URL:", error);
    return url;
  }
}
