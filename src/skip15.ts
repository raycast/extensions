import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { safeLaunchCommandInBackground } from "./helpers/safeCommandLauncher";
import { seek } from "./api/seek";

export default async function Command() {
  await setSpotifyClient();

  const currentlyPlayingData = await getCurrentlyPlaying();
  const nothingIsPlaying = !currentlyPlayingData || !currentlyPlayingData.item;

  if (nothingIsPlaying) {
    return await showHUD("Nothing is currently playing");
  }

  try {
    const currentPositionSeconds = (currentlyPlayingData?.progress_ms || 0) / 1000;
    await seek(currentPositionSeconds + 15);
    await showHUD("Skipped ahead 15 seconds");
    await safeLaunchCommandInBackground("current-track");
  } catch (error) {
    await showHUD("Nothing is currently playing");
  }
}
