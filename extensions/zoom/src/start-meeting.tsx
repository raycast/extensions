import { open, closeMainWindow, Clipboard, popToRoot, showToast, Toast, showHUD } from "@raycast/api";
import { createInstantMeeting } from "./api/meetings";
import { zoom } from "./components/withZoomAuth";
import { getZoomUrlForPlatform } from "./helpers/meetings";

export default async function Command() {
  const token = await zoom.authorize();

  try {
    await showToast({ style: Toast.Style.Animated, title: "Creating meeting" });

    const meeting = await createInstantMeeting(token);

    const zoomUrl = getZoomUrlForPlatform(meeting.join_url);
    await open(zoomUrl);

    await Clipboard.copy(meeting.join_url);
    await showHUD("Copied Join URL to clipboard");

    await closeMainWindow();
    await popToRoot();
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to create meeting" });
  }
}
