import { showHUD } from "@raycast/api";
import { zoomExecuteMenu } from "./zoom-meeting";

export default async function main() {
	const res = await zoomExecuteMenu("Unmute Audio");
	if (res == true) {
			showHUD("Zoom meeting unmuted 🎤")
	} else if (res == false) {
			showHUD("Zoom meeting already unmuted 🎤")
	}
}
