import { openYouTube, openYouTubeURL, fetchRealHistory } from "./webapp";
import { showToast, Toast } from "@raycast/api";

export default async function WatchingCommand() {
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
      await openYouTubeURL(history[0].url);
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

  await openYouTube();
}
