import { showHUD } from "@raycast/api";

import { zoomExecuteMenu } from "./zoom-meeting";

export default async function main() {
  const res = await zoomExecuteMenu({ menu: "Meeting", menuItem: "Stop Share" });
  if (res != null) {
    showHUD(`Zoom meeting screen share ${res ? "stopped ⏹️" : "not shared"}`);
  }
}
