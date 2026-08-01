import {
  openYouTube,
  openYouTubeURL,
  fetchContinueWatchingUrl,
} from "./webapp";
import { showToast, Toast } from "@raycast/api";

export default async function WatchingCommand() {
  // Try to fetch the actual continue-watching video URL from Safari's
  // authenticated YouTube session
  try {
    const url = await fetchContinueWatchingUrl();
    if (url) {
      await openYouTubeURL(url);
      return;
    }
  } catch {
    // Safari JS not enabled or no continue-watching found — fall through
  }

  // Fallback: just open YouTube homepage
  await showToast({
    style: Toast.Style.Animated,
    title: "Opening YouTube",
    message: "Enable Safari JavaScript in Setup for continue-watching",
  });
  await openYouTube();
}
