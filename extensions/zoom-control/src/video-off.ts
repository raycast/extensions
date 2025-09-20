import { showHUD } from "@raycast/api";

import { zoomExecuteMenu } from "./zoom-meeting";

export default async function main() {
  const res = await zoomExecuteMenu({ menu: "Meeting", menuItem: "Stop Video" });
  if (res != null) {
    showHUD(`Zoom meeting video ${res ? "stopped" : "already stopped"} 🙈`);
  }
}
