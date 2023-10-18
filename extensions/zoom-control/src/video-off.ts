import { showHUD } from "@raycast/api";
import { zoomExecuteMenu } from "./zoom-meeting";

export default async function main() {
  const res = await zoomExecuteMenu("Stop Video");
  if (res != null) {
    showHUD(`Zoom meeting video ${res ? "stopped" : "already stopped"} 🙈`);
  }
}
