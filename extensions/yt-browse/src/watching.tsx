import { openYouTube, openYouTubeURL, fetchRealHistory } from "./webapp";
import { showToast, Toast } from "@raycast/api";

export default async function WatchingCommand() {
  // Fetch real history and open the most recent video
  try {
    const history = await fetchRealHistory();
    if (history.length > 0) {
      await openYouTubeURL(history[0].url);
      return;
    }
  } catch {
    // Safari JS not enabled or fetch failed — fall through
  }

  // Fallback: just open YouTube homepage
  await showToast({
    style: Toast.Style.Animated,
    title: "Opening YouTube",
    message: "Enable Safari JavaScript in Setup for continue-watching",
  });
  await openYouTube();
}
