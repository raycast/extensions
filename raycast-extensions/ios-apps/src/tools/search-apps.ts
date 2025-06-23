import { searchApps } from "../ipatool";
import { enrichAppDetails } from "../utils/itunes-api";

export type Input = {
  /**
   * The search query for finding iOS apps
   */
  query: string;
  /**
   * Maximum number of results to return (default: 10, max: 20)
   */
  limit?: number;
};

/**
 * Search for iOS apps by name or keyword
 */
export default async function searchIosApps(input: Input) {
  console.log(`[search-apps tool] Searching for apps with query: "${input.query}", limit: ${input.limit || 10}`);

  // Ensure limit is within bounds
  const validLimit = Math.min(Math.max(1, Number(input.limit) || 10), 20);

  try {
    // Search for apps using ipatool
    const apps = await searchApps(input.query, validLimit);
    console.log(`[search-apps tool] Found ${apps.length} apps`);

    // Map the results to a more user-friendly format
    const formattedApps = await Promise.all(
      apps.map(async (app) => {
        // Convert from ipatool format to AppDetails format
        const appDetails = {
          id: String(app.id),
          bundleId: app.bundleID,
          name: app.name,
          version: app.version,
          price: String(app.price),
          // Default values for required fields
          artworkUrl60: undefined,
          description: "",
          iconUrl: "",
          sellerName: "",
          genres: [],
          size: "0",
          contentRating: "",
        };

        // Try to enrich with additional details from iTunes API
        try {
          const enriched = await enrichAppDetails(appDetails);
          return {
            id: enriched.id,
            bundleId: enriched.bundleId,
            name: enriched.name,
            version: enriched.version,
            price: enriched.price,
            developer: enriched.sellerName,
            icon: enriched.artworkUrl512 || enriched.artworkUrl60 || enriched.iconUrl,
            rating: enriched.averageUserRating,
            description: enriched.description?.substring(0, 200) + (enriched.description?.length > 200 ? "..." : ""),
          };
        } catch (error) {
          console.error(`[search-apps tool] Error enriching app details: ${error}`);
          // Return basic info if enrichment fails
          return {
            id: appDetails.id,
            bundleId: appDetails.bundleId,
            name: appDetails.name,
            version: appDetails.version,
            price: appDetails.price,
          };
        }
      }),
    );

    return { apps: formattedApps };
  } catch (error) {
    console.error(`[search-apps tool] Error: ${error}`);
    throw new Error(`Failed to search for apps: ${error}`);
  }
}
