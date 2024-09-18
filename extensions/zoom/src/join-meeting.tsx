import { open } from "@raycast/api";

export default async function Command(props: { arguments: Arguments.JoinMeeting }) {
  await open(`https://zoom.us/j/${props.arguments.meetingId}`);
}
