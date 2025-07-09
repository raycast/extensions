import { getAppDetails, searchApps } from "../ipatool";
import { formatPrice } from "../utils/paths";
import { formatDate } from "../utils/common";

export type Input = {
  /**
   * The name or search term for the iOS app
   */
  query: string;

  /**
   * Optional bundle ID if known (will skip search step)
   */
  bundleId?: string;
};

/**
 * Get detailed information about an iOS app by name or bundle ID
 */
export default async function getIosAppDetails(input: Input) {
  console.log(`[get-app-details tool] Getting details for app: "${input.query}"`);

  try {
    // Will store the app details
    let bundleId = input.bundleId;

    // If no bundle ID is provided, search for the app first
    if (!bundleId) {
      console.log(`[get-app-details tool] No bundle ID provided, searching for app: "${input.query}"`);
      const searchResults = await searchApps(input.query, 1);

      if (searchResults.length === 0) {
        throw new Error(`No apps found matching "${input.query}"`);
      }

      bundleId = searchResults[0].bundleID;
      console.log(`[get-app-details tool] Found app with bundle ID: ${bundleId}`);
    }

    // Get app details using ipatool
    const appDetails = await getAppDetails(bundleId);

    if (!appDetails) {
      throw new Error(`App details not found for "${input.query}"`);
    }

    console.log(`[get-app-details tool] Successfully retrieved details for ${appDetails.name}`);

    // Format the app details for better readability
    const formattedDetails = {
      id: appDetails.id,
      bundleId: appDetails.bundleId,
      name: appDetails.name,
      version: appDetails.version,
      developer: appDetails.sellerName,
      price: formatPrice(appDetails.price),
      description: appDetails.description,
      icon: appDetails.artworkUrl512 || appDetails.artworkUrl60 || appDetails.iconUrl,
      rating: appDetails.averageUserRating,
      ratingCount: appDetails.userRatingCount,
      size: appDetails.size,
      contentRating: appDetails.contentRating,
      releaseDate: appDetails.releaseDate ? formatDate(appDetails.releaseDate) : undefined,
      lastUpdated: appDetails.currentVersionReleaseDate ? formatDate(appDetails.currentVersionReleaseDate) : undefined,
      genres: appDetails.genres,
      appStoreUrl: appDetails.trackViewUrl || `https://apps.apple.com/app/id${appDetails.id}`,
      developerUrl: appDetails.artistViewUrl,
      screenshots: appDetails.screenshotUrls,
    };

    return { app: formattedDetails };
  } catch (error) {
    console.error(`[get-app-details tool] Error:`, error);
    throw new Error(`Failed to get app details: ${error.message || error}`);
  }
}
