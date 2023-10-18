import { showHUD } from "@raycast/api";
import { zoomExecuteMenu } from "./zoom-meeting";

export default async function main() {
	const res = await zoomExecuteMenu("Start Video");
	if (res == true) {
			showHUD("Zoom meeting video started 🎥")
	} else if (res == false) {
			showHUD("Zoom meeting video already has video 🎥")
	}
}
