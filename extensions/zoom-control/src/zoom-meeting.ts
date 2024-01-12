import { showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export enum ZoomMenuResult {
  HandledError = "",
  Executed = "zoom-menu-executed",
  NoMenu1 = "zoom-no-menu1",
  NoMenu2 = "zoom-no-menu2",
  Menu2Disabled = "zoom-menu-disabled",
}

export async function zoomMenu(menu1: string, menu2: string): Promise<ZoomMenuResult> {
  await showToast({
    style: Toast.Style.Animated,
    title: "Finding Zoom...",
  });

  const script = `
on run argv
  set menu1 to item 1 of argv
  set menu2 to item 2 of argv

  if not application "zoom.us" is running then
    return "zoom-not-running"
  end if

  tell application "System Events" to tell application process "zoom.us"
    if not exists (menu bar item menu1 of menu bar 1) then
      return "zoom-no-menu1"
    end if

    tell (menu bar item menu1 of menu bar 1)
      if not exists (menu item menu2 of menu 1) then
        return "zoom-no-menu2"
      end if

      set isEnabled to enabled of menu item menu2 of menu 1
      if not isEnabled then
        return "zoom-menu-disabled"
      end if

      click menu item (menu2) of menu 1
      return "zoom-menu-executed"
    end tell
  end tell
end run
`;

  const res = await runAppleScript<string>(script, [menu1, menu2]);
  if (res == "zoom-not-running") {
    showFailureToast("Zoom not running");
    return ZoomMenuResult.HandledError;
  }

  return res as ZoomMenuResult;
}

export async function zoomExecuteMenu(menuItem: string): Promise<boolean | null> {
  const res = await zoomMenu("Meeting", menuItem);
  switch (res) {
    case ZoomMenuResult.Executed:
      return true;
    case ZoomMenuResult.NoMenu1:
      showNoZoomMeeting();
      return null;
    case ZoomMenuResult.NoMenu2:
    case ZoomMenuResult.Menu2Disabled:
      return false;
    case ZoomMenuResult.HandledError:
      // Error is reported before being returned.
      return null;
    default:
      showFailureToast(res);
      return null;
  }
}

export async function zoomMenuIcon(menuItem: string): Promise<ZoomMenuResult> {
  await showToast({
    style: Toast.Style.Animated,
    title: "Finding Zoom...",
  });

  const script = `
on run argv
  set menuToSelect to item 1 of argv

  if not application "zoom.us" is running then
    return "zoom-not-running"
  end if

  tell application "System Events" to tell application process "zoom.us"
  	if not exists (menu bar item 1 of menu bar 2) then
      return "zoom-no-menu1"
    end if

    tell (menu bar item 1 of menu bar 2)
      if not exists (menu item menuToSelect of menu 1) then
        return "zoom-no-menu2"
      end if

      click menu item menuToSelect of menu 1
      return "zoom-menu-executed"
    end tell
  end tell
end run
`;

  const res = await runAppleScript<string>(script, [menuItem]);
  if (res == "zoom-not-running") {
    showNoZoomMeeting();
    return ZoomMenuResult.HandledError;
  }

  return res as ZoomMenuResult;
}

export async function showNoZoomMeeting() {
  showFailureToast("No active Zoom meeting");
}
