import { open } from "@raycast/api";
import { getZoomUrlForMeetingId } from "../helpers/meetings";

type Input = {
  /* The Zoom meeting ID to join */
  meetingId: string;
};

export default async function JoinMeetingTool({ meetingId }: Input) {
  const zoomUrl = getZoomUrlForMeetingId(meetingId);
  await open(zoomUrl);
}
