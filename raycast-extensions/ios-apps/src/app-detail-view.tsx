// src/app-detail-view.tsx - Detail view for an app
// Displays comprehensive information about an iOS app with metadata and actions
import { Detail, Color, Icon } from "@raycast/api";
import { AppDetails } from "./types";
import { formatPrice } from "./utils/paths";
import { renderStarRating, formatDate } from "./utils/common";
import { AppActionPanel } from "./components/app-action-panel";
import { useAppDetails, useAppDownload } from "./hooks";

interface AppDetailViewProps {
  app: AppDetails;
}

export default function AppDetailView({ app: initialApp }: AppDetailViewProps) {
  // Use the custom hooks
  const { app, isLoading } = useAppDetails(initialApp);
  const { downloadApp } = useAppDownload();

  // Function to format file size to human-readable format (e.g., KB, MB, GB)
  // Handles string or number input and provides fallbacks for invalid values
  function formatFileSize(bytes: number | string): string {
    if (!bytes || bytes === 0 || bytes === "0") return "Unknown";

    // Convert string to number if needed
    const bytesNum = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;

    if (isNaN(bytesNum) || bytesNum === 0) return "Unknown";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytesNum) / Math.log(k));
    return parseFloat((bytesNum / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Get the app icon URL with fallbacks (prioritizing higher resolution)
  // Uses artworkUrl512 first, then falls back to artworkUrl60, then iconUrl
  const iconUrl = app.artworkUrl512 || app.artworkUrl60 || app.iconUrl || "";
  console.log(`[AppDetailView] Rendering app: ${app.name}, version: ${app.version}, bundleID: ${app.bundleId}`);
  console.log("[AppDetailView] Using icon URL:", iconUrl);

  // Create a fallback App Store URL if trackViewUrl is not available
  const appStoreUrl = app.trackViewUrl || `https://apps.apple.com/app/id${app.id}`;
  console.log("[AppDetailView] Using App Store URL:", appStoreUrl);

  // Get the app rating
  const rating = app.averageUserRatingForCurrentVersion || app.averageUserRating;
  const ratingCount = app.userRatingCountForCurrentVersion || app.userRatingCount;
  const ratingText = rating ? `${rating.toFixed(1)} ${renderStarRating(rating)}` : "No Rating";

  // Format rating count with K/M suffix for thousands/millions
  let ratingCountText = "No Ratings";
  if (ratingCount) {
    if (ratingCount >= 1000000) {
      ratingCountText = `${(ratingCount / 1000000).toFixed(1)}M Ratings`;
    } else if (ratingCount >= 1000) {
      ratingCountText = `${(ratingCount / 1000).toFixed(1)}K Ratings`;
    } else {
      ratingCountText = `${ratingCount} Ratings`;
    }
  }

  // Format release dates
  const releaseDate = formatDate(app.releaseDate);
  const currentVersionReleaseDate = formatDate(app.currentVersionReleaseDate);

  // Debug information - helps troubleshoot missing or incorrect data
  console.log("[AppDetailView] App genres:", app.genres);
  console.log("[AppDetailView] App sellerName:", app.sellerName);
  console.log("[AppDetailView] App price:", app.price, "formatted as:", formatPrice(app.price));
  console.log("[AppDetailView] App size:", app.size, "formatted as:", formatFileSize(app.size));
  // Log the full app object for comprehensive debugging (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log("[AppDetailView] Full app object:", JSON.stringify(app, null, 2));
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={app.name}
      markdown={`
## ${app.name} (${app.version})

${iconUrl && `![App Icon](${iconUrl}?raycast-width=128&raycast-height=128)`}

${app.description || "No description available"}

${
  app.screenshotUrls && app.screenshotUrls.length > 0
    ? `
### Screenshots

${app.screenshotUrls.map((url, index) => `![Screenshot ${index + 1}](${url}?raycast-width=128)`).join(" ")}
`
    : ""
}
      `}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Genres">
            {app.genres && app.genres.length > 0 ? (
              app.genres.map((genre, index) => (
                <Detail.Metadata.TagList.Item key={index} text={genre} color={Color.PrimaryText} />
              ))
            ) : (
              <Detail.Metadata.TagList.Item text="No genres available" color={Color.SecondaryText} />
            )}
          </Detail.Metadata.TagList>

          <Detail.Metadata.Label title="Developer" text={app.sellerName || "Unknown Developer"} icon={Icon.Person} />

          {app.price !== "0" && (
            <Detail.Metadata.Label title="Price" text={formatPrice(app.price)} icon={Icon.BankNote} />
          )}

          <Detail.Metadata.Label title={ratingCountText} text={ratingText} icon={Icon.Star} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Version" text={app.version} icon={Icon.Tag} />

          <Detail.Metadata.Label title="Updated" text={currentVersionReleaseDate} icon={Icon.Clock} />

          <Detail.Metadata.Label title="Released" text={releaseDate} icon={Icon.Calendar} />

          <Detail.Metadata.Label title="Size" text={formatFileSize(app.size)} icon={Icon.HardDrive} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Link title="View in App Store" target={appStoreUrl} text="Open App Store" />

          {app.artistViewUrl && (
            <Detail.Metadata.Link title="Developer Website" target={app.artistViewUrl} text="View Developer" />
          )}
        </Detail.Metadata>
      }
      actions={
        <AppActionPanel
          app={app}
          onDownload={() => downloadApp(app.bundleId, app.name, app.version, app.price, true)}
          showViewDetails={false}
        />
      }
    />
  );
}
