import { showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export async function zoomExecuteMenu(menuItem: string): Promise<boolean | null> {
  await showToast({
    style: Toast.Style.Animated,
    title: "Finding Zoom...",
  });

  const script = `
on run argv
	if application "zoom.us" is running then
		tell application "System Events"
			tell application process "zoom.us"
				if exists (menu bar item "Meeting" of menu bar 1) then
					if exists (menu item (item 1 of argv) of menu 1 of menu bar item "Meeting" of menu bar 1) then
						click menu item (item 1 of argv) of menu 1 of menu bar item "Meeting" of menu bar 1
						return "zoom-menu-executed"
					else
						return "zoom-no-menu"
					end if
				else
					return "zoom-no-meeting"
				end if
			end tell
		end tell
	else
		set returnValue to "zoom-not-running"
	end if
end run
  `;

  const res = await runAppleScript<string>(script, [menuItem]);
  switch (res) {
    case "zoom-not-running": {
      showFailureToast("Zoom not running");
      return null;
    }
    case "zoom-no-meeting": {
      showFailureToast("No active Zoom meeting");
      return null;
    }
    case "zoom-no-menu": {
      return false;
    }
    case "zoom-menu-executed": {
      return true;
    }
    default: {
      showFailureToast("Zoom mute toggle error: " + res);
    }
  }

  return null;
}
