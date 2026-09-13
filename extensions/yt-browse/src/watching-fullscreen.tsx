import {
  focusOrOpenYouTube,
  fetchRealHistory,
  isYouTubeRunning,
  enterFullscreen,
} from "./webapp";
import { getHistoryFromCache } from "./query";
import { showToast, Toast } from "@raycast/api";

export default async function WatchingFullscreenCommand() {
  // If YouTube is already running, just focus + fullscreen
  const running = await isYouTubeRunning();
  if (running) {
    await showToast({
      style: Toast.Style.Success,
      title: "YouTube is already open",
      message: "Focusing + fullscreen",
    });
    await focusOrOpenYouTube();
    await enterFullscreen();
    return;
  }

  // Not running — try cached history first (instant)
  const cached = await getHistoryFromCache();
  if (cached && cached.length > 0) {
    await showToast({
      style: Toast.Style.Success,
      title: "Opening last watched video",
      message: cached[0].title,
    });
    await focusOrOpenYouTube(cached[0].url);
    // Wait for video to load before entering fullscreen
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await enterFullscreen();
    return;
  }

  // No cache — fetch via Safari JS
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Finding your last video...",
    message: "Reading YouTube history",
  });

  try {
    const history = await fetchRealHistory();
    if (history.length > 0) {
      toast.style = Toast.Style.Success;
      toast.title = "Opening last watched video";
      toast.message = history[0].title;
      await focusOrOpenYouTube(history[0].url);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await enterFullscreen();
      return;
    }
    toast.style = Toast.Style.Failure;
    toast.title = "No history found";
    toast.message = "Opening YouTube homepage instead";
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't fetch history";
    toast.message = "Enable Safari JavaScript in Setup";
  }

  await focusOrOpenYouTube();
}
