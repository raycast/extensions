import { closeMainWindow, getPreferenceValues } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { ZedBuild } from "./lib/zed";
import { isWindows } from "./lib/utils";
import { execWindowsZed } from "./lib/windows";

const preferences: Record<string, string> = getPreferenceValues();
const zedBuild: ZedBuild = preferences.build as ZedBuild;

const makeNewWindow = async () => {
  if (isWindows) {
    await execWindowsZed(["-n"]);
  } else {
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
  }
};

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewWindow();
  } catch (error) {
    showFailureToast(error, { title: "Failed opening new window" });
  }
}
