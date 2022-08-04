import { open, closeMainWindow, Clipboard, popToRoot, showToast, Toast, showHUD } from "@raycast/api";
import { createInstantMeeting } from "./api/meetings";
import { authorize } from "./api/oauth";

export default async function Command() {
  await authorize();

  try {
    await showToast({ style: Toast.Style.Animated, title: "Creating meeting" });

    const meeting = await createInstantMeeting();

    await open(meeting.join_url);

    await Clipboard.copy(meeting.join_url);
    await showHUD("Copied Join URL to clipboard");

    await closeMainWindow();
    await popToRoot();
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to create meeting" });
  }
}
