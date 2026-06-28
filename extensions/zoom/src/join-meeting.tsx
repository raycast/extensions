import { open } from "@raycast/api";
import { getZoomUrlForMeetingId } from "./helpers/meetings";

export default async function Command(props: { arguments: Arguments.JoinMeeting }) {
  const zoomUrl = getZoomUrlForMeetingId(props.arguments.meetingId);
  await open(zoomUrl);
}
