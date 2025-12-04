import { showHUD } from "@raycast/api";

import { zoomExecuteMenu } from "./zoom-meeting";

export default async function main() {
  const muteRes = await zoomExecuteMenu({ menu: "Meeting", menuItem: "Mute Audio" });
  if (muteRes == null) {
    // Error finding zoom meeting.
    return;
  }

  if (muteRes) {
    showHUD(`Zoom meeting muted  🤐`);
    return;
  }

  const unmuteRes = await zoomExecuteMenu({ menu: "Meeting", menuItem: "Unmute Audio" });
  if (unmuteRes) {
    showHUD(`Zoom meeting unmuted 🎤`);
  }
}
