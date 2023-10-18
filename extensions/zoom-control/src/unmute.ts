import { showHUD } from "@raycast/api";
import { zoomExecuteMenu } from "./zoom-meeting";

export default async function main() {
  const res = await zoomExecuteMenu("Unmute Audio");
  showHUD(`Zoom meeting ${res ? "unmuted" : "already unmuted"} 🎤`);
}
