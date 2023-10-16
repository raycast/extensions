import { LaunchProps, showHUD } from "@raycast/api";
import { zoomExecuteMenu } from "./zoom-meeting";

export default async function main(props: LaunchProps) {
	var res = await zoomExecuteMenu("Stop Video");
	if (res == true) {
			showHUD("Zoom video stopped 🙈")
	} else if (res == false) {
			showHUD("Zoom video already stopped 🙈")
	}
}
