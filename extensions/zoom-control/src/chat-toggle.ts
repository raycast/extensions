import { showHUD } from "@raycast/api";

import { zoomExecuteMenu } from "./zoom-meeting";

export default async function main() {
  const closeRes = await zoomExecuteMenu({ menu: "View", menuItem: "Close Chat" });
  if (closeRes == null) {
    // Error finding zoom meeting.
    return;
  }

  if (closeRes) {
    showHUD(`Chat closed 💬`);
    return;
  }

  const showRes = await zoomExecuteMenu({ menu: "View", menuItem: "Show Chat" });
  if (showRes) {
    showHUD(`Chat shown 💬`);
  }
}
