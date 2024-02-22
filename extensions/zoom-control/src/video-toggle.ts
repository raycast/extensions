import { showHUD } from "@raycast/api";
import { zoomExecuteMenu } from "./zoom-meeting";

export default async function main() {
  const stopRes = await zoomExecuteMenu("Stop Video");
  if (stopRes == null) {
    // Error finding zoom meeting.
    return;
  }

  if (stopRes) {
    showHUD(`Zoom meeting video stopped 🙈`);
    return;
  }

  const startRes = await zoomExecuteMenu("Start Video");
  if (startRes) {
    showHUD(`Zoom meeting video started 🎥`);
  }
}
