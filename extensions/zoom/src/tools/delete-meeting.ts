import { withAccessToken } from "@raycast/utils";
import { deleteMeeting, getMeeting } from "../api/meetings";
import { zoom } from "../components/withZoomAuth";
import { format, formatDuration, intervalToDuration } from "date-fns";

type Input = {
  /** The ID of the meeting to delete */
  meetingId: string;
};

export default withAccessToken(zoom)(async ({ meetingId }: Input) => {
  return await deleteMeeting(meetingId);
});

export const confirmation = withAccessToken(zoom)(async ({ meetingId }: Input) => {
  const meeting = await getMeeting(meetingId);

  const info = [
    { name: "Meeting ID", value: meeting.id },
    { name: "Meeting URL", value: meeting.join_url },
    { name: "Duration", value: formatDuration(intervalToDuration({ start: 0, end: meeting.duration * 60 * 1000 })) },
  ];

  /* Instant and recurring meetings without fixed time don't have a start time */
  if (meeting.type !== 3 && meeting.type !== 1) {
    info.push({ name: "Start time", value: format(new Date(meeting.start_time), "EEE MMM d HH:mm") });
  }

  if (meeting.agenda) info.push({ name: "Agenda", value: meeting.agenda });
  if (meeting.topic) info.push({ name: "Topic", value: meeting.topic });
  if (meeting.timezone) info.push({ name: "Timezone", value: meeting.timezone });

  return {
    message: `Are you sure you want to delete the selected meeting?`,
    info,
  };
});
