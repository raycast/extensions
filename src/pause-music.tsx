import { showToast, Toast } from "@raycast/api";
import { spawn } from "child_process";
import { loadPlaybackState, savePlaybackState } from "./shared-state";

export default async function Command() {
  try {
    const currentState = loadPlaybackState();

    if (currentState) {
      if (currentState.isPlaying) {
        // Pause the music
        const killProcess = spawn("pkill", ["-f", "afplay"]);

        killProcess.on("close", (code) => {
          // Update state to paused regardless of pkill result
          savePlaybackState({
            ...currentState,
            isPlaying: false,
            isPaused: true,
          });

          showToast({
            style: Toast.Style.Success,
            title: "⏸ Paused",
            message: currentState.currentTrack
              ? `"${currentState.currentTrack.name}" paused`
              : "Looma.FM music paused",
          });
        });

        killProcess.on("error", (err) => {
          showToast({
            style: Toast.Style.Failure,
            title: "Pause Error",
            message: "Could not pause music",
          });
        });
      } else if (currentState.isPaused && currentState.currentTrack) {
        // Resume playback by clearing paused state - main player will handle resume
        savePlaybackState({
          ...currentState,
          isPlaying: false,
          isPaused: false, // Signal to resume
        });

        showToast({
          style: Toast.Style.Success,
          title: "▶️ Resume",
          message: `Open Looma.FM Music to resume "${currentState.currentTrack.name}"`,
        });
      } else {
        showToast({
          style: Toast.Style.Animated,
          title: "No Music Playing",
          message: "Open Looma.FM Music to start streaming",
        });
      }
    } else {
      // No saved state, just kill any processes
      const killProcess = spawn("pkill", ["-f", "afplay"]);

      killProcess.on("close", (code) => {
        showToast({
          style: Toast.Style.Animated,
          title: "No Music Playing",
          message: "Open Looma.FM Music to start streaming",
        });
      });

      killProcess.on("error", (err) => {
        showToast({
          style: Toast.Style.Animated,
          title: "No Music Playing",
          message: "Open Looma.FM Music to start streaming",
        });
      });
    }
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to pause music",
    });
  }
}
