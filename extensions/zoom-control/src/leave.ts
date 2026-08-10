import { showHUD } from "@raycast/api";
import { runAS, ZoomMenuResult, zoomMenuIcon, showNoZoomMeeting } from "./zoom-meeting";
import { showFailureToast } from "@raycast/utils";

export default async function main() {
  // Prefer to leave via the Zoom icon in the menubar, since it shows
  // the "End" dialog in the center of the meeting window rather than
  // at the top-left when we use close button applescript.
  const res = await zoomMenuIcon("End Meeting");
  switch (res) {
    case ZoomMenuResult.Executed:
      showHUD("Leaving zoom meeting");
      return null;
    case ZoomMenuResult.NoMenu1:
      // No menu icon, may not be enabled, try closing the window directly.
      return closeWindow();
    case ZoomMenuResult.NoMenu2:
    case ZoomMenuResult.Menu2Disabled:
      showNoZoomMeeting();
      return null;
    case ZoomMenuResult.HandledError:
      return null;
    default:
      showFailureToast("Unexpected error: " + res);
  }
}

async function closeWindow() {
  const script = `
tell application "System Events"
  set zoomWindows to windows of process "zoom.us"
  repeat with i from 1 to count of zoomWindows
    set curWindow to (item i of zoomWindows)
    if name of curWindow is equal to "Zoom Meeting" then
      click (first button of curWindow whose description is "close button")
      return "zoom-meeting-window-closed"
    end if
  end repeat
  return "zoom-no-meeting-windows"
end tell
`;

  const res = await runAS(script);
  if (res == "zoom-meeting-window-closed") {
    showHUD("Leaving zoom meeting");
  } else {
    // The zoom meeting window may not exist if there's no meeting or if we're
    // screensharing, so we use a different error than showNoZoomMeeting here.
    showFailureToast("No zoom meeting window");
  }
}
