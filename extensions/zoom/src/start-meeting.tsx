import {
  open,
  closeMainWindow,
  Clipboard,
  popToRoot,
  showToast,
  Toast,
  showHUD,
  getPreferenceValues,
} from "@raycast/api";
import { createInstantMeeting } from "./api/meetings";
import { zoom } from "./components/withZoomAuth";
import {
  getZoomJoinUrlForMeetingId,
  getZoomUrlForMeetingId,
  getZoomUrlForPlatform,
  isValidZoomMeetingId,
  normalizeZoomMeetingId,
} from "./helpers/meetings";

export default async function Command() {
  const { personalMeetingId } = getPreferenceValues<Preferences.StartMeeting>();
  const meetingId = personalMeetingId ? normalizeZoomMeetingId(personalMeetingId) : "";

  if (personalMeetingId) {
    if (!isValidZoomMeetingId(meetingId)) {
      await showHUD("Invalid Zoom Personal Meeting ID");
      return;
    }

    try {
      await open(getZoomUrlForMeetingId(meetingId));
      await Clipboard.copy(getZoomJoinUrlForMeetingId(meetingId));
      await showHUD("Started Personal Meeting");

      await closeMainWindow();
      await popToRoot();
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to start meeting" });
    }

    return;
  }

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
