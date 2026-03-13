import { withAccessToken } from "@raycast/utils";
import { createInstantMeeting } from "../api/meetings";
import { getOAuthToken, zoom } from "../components/withZoomAuth";

/**
 * Use this tool to create a Zoom meeting link that can be shared or added to calendars.
 */
async function createInstantMeetingTool() {
  const token = getOAuthToken();
  const meeting = await createInstantMeeting(token);
  return meeting;
}

export default withAccessToken(zoom)(createInstantMeetingTool);
