import { open } from "@raycast/api";

type Input = {
  /* The Zoom meeting ID to join */
  meetingId: string;
};

export default async function JoinMeetingTool({ meetingId }: Input) {
  await open(`https://zoom.us/j/${meetingId}`);
}
