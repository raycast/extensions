import { showHUD } from "@raycast/api";
import { zoomExecuteMenu } from "./zoom-meeting";

export default async function main() {
  const res = await zoomExecuteMenu("Mute Audio");
  if (res != null) {
    showHUD(`Zoom meeting ${res ? "muted " : "already muted"} 🤐`);
  }
}
