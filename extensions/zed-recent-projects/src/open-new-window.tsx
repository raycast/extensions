import { Toast, closeMainWindow, showToast, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { ZedBuild } from "./lib/zed";

const preferences: Record<string, string> = getPreferenceValues();
const zedBuild: ZedBuild = preferences.build as ZedBuild;

const makeNewWindow = async () => {
  await runAppleScript(`
    tell application "${zedBuild}"
	    activate
    end tell
    delay(0.5)
    tell application "${zedBuild}"
	    activate
    end tell

    tell application "System Events"
	    tell process "${zedBuild}"
		    click menu item "New Window" of menu "File" of menu bar 1
	    end tell
    end tell
  `);
};

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewWindow();
  } catch (error) {
    await showToast({
      title: "Failed opening new window",
      style: Toast.Style.Failure,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
``;
