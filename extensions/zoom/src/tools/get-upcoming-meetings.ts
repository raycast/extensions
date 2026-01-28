import { withAccessToken } from "@raycast/utils";
import { getUpcomingMeetings } from "../api/meetings";
import { zoom } from "../components/withZoomAuth";

async function getUpcomingMeetingsTool() {
  return await getUpcomingMeetings();
}

export default withAccessToken(zoom)(getUpcomingMeetingsTool);
