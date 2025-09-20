import { withAccessToken } from "@raycast/utils";
import { createScheduledMeeting, timezone } from "../api/meetings";
import { zoom } from "../components/withZoomAuth";
import { format, formatDuration, intervalToDuration } from "date-fns";

type Input = {
  /**  The meeting's start time. This supports local time and GMT formats.
   * To set a meeting's start time in GMT, use the yyyy-MM-ddTHH:mm:ssZ date-time format. For example, 2020-03-31T12:02:00Z.
   * To set a meeting's start time using a specific timezone, use the yyyy-MM-ddTHH:mm:ss date-time format and specify the timezone ID in the timezone field. If you do not specify a timezone, the timezone value defaults to your Zoom account's timezone. You can also use UTC for the timezone value. Note: If no start_time is set for a scheduled meeting, the start_time is set at the current time and the meeting type changes to an instant meeting, which expires after 30 days.
   */
  start_time: string;
  /* The meeting's scheduled duration, in minutes. */
  duration: number;
  /* The meeting's agenda. This value has a maximum length of 2,000 characters. */
  agenda?: string;
  /* The meeting's topic. Max 200 characters. */
  topic?: string;
  /* The timezone to assign to the start_time value. */
  timezone?: timezone;
};

async function createScheduledMeetingTool({ start_time, duration, agenda, topic, timezone }: Input) {
  return await createScheduledMeeting({ start_time, duration, agenda, topic, timezone });
}

export const confirmation = async ({ start_time, duration, agenda, topic, timezone }: Input) => {
  const info = [
    { name: "Start time", value: format(new Date(start_time), "EEE MMM d HH:mm") },
    { name: "Duration", value: formatDuration(intervalToDuration({ start: 0, end: duration * 60 * 1000 })) },
  ];

  if (agenda) info.push({ name: "Agenda", value: agenda });
  if (topic) info.push({ name: "Topic", value: topic });
  if (timezone) info.push({ name: "Timezone", value: timezone });

  return {
    message: `Are you sure you want to create a scheduled meeting?`,
    info,
  };
};

export default withAccessToken(zoom)(createScheduledMeetingTool);
