import { withAccessToken } from "@raycast/utils";
import { getMeeting, timezone, updateMeeting } from "../api/meetings";
import { zoom } from "../components/withZoomAuth";
import { format, formatDuration, intervalToDuration } from "date-fns";

type Input = {
  meetingId: string;
  /**  The meeting's start time. This supports local time and GMT formats.
   * To set a meeting's start time in GMT, use the yyyy-MM-ddTHH:mm:ssZ date-time format. For example, 2020-03-31T12:02:00Z.
   * To set a meeting's start time using a specific timezone, use the yyyy-MM-ddTHH:mm:ss date-time format and specify the timezone ID in the timezone field. If you do not specify a timezone, the timezone value defaults to your Zoom account's timezone. You can also use UTC for the timezone value. Note: If no start_time is set for a scheduled meeting, the start_time is set at the current time and the meeting type changes to an instant meeting, which expires after 30 days.
   */
  start_time?: string;
  /* The meeting's scheduled duration, in minutes. */
  duration?: number;
  /* The meeting's agenda. This value has a maximum length of 2,000 characters. */
  agenda?: string;
  /* The meeting's topic. Max 200 characters. */
  topic?: string;
  /* The timezone to assign to the start_time value. */
  timezone?: timezone;
};

export default withAccessToken(zoom)(async ({ meetingId, ...payload }: Input) => {
  return await updateMeeting(meetingId, payload);
});

export const confirmation = withAccessToken(zoom)(async ({ meetingId, ...payload }: Input) => {
  const meeting = await getMeeting(meetingId);

  const info = Object.entries(payload).reduce((acc, [key, newValue]) => {
    const oldValue = meeting[key as keyof typeof meeting];
    if (newValue !== oldValue) {
      let formattedOldValue = oldValue;
      let formattedNewValue = newValue;

      if (key === "start_time") {
        formattedOldValue = format(new Date(oldValue), "EEE MMM d HH:mm");
        formattedNewValue = format(new Date(newValue), "EEE MMM d HH:mm");
      } else if (key === "duration") {
        formattedOldValue = formatDuration(intervalToDuration({ start: 0, end: +oldValue * 60 * 1000 }));
        formattedNewValue = formatDuration(intervalToDuration({ start: 0, end: +newValue * 60 * 1000 }));
      }

      acc.push({
        name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: `${formattedOldValue} → ${formattedNewValue}`,
      });
    }
    return acc;
  }, [] as { name: string; value: string }[]);

  if (info.length === 0) {
    info.push({ name: "Note", value: "No changes detected" });
  }

  return {
    message: `Are you sure you want to update the selected meeting?`,
    info,
  };
});
