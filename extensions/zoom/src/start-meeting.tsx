import { open, closeMainWindow, Clipboard, popToRoot, showToast, Toast, showHUD } from "@raycast/api";
import { createInstantMeeting } from "./api/meetings";
import { zoom } from "./components/withZoomAuth";

export default async function Command() {
  const token = await zoom.authorize();

  try {
    await showToast({ style: Toast.Style.Animated, title: "Creating meeting" });

    const meeting = await createInstantMeeting(token);

    await open(meeting.join_url);

    await Clipboard.copy(meeting.join_url);
    await showHUD("Copied Join URL to clipboard");

    await closeMainWindow();
    await popToRoot();
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to create meeting" });
  }
}
