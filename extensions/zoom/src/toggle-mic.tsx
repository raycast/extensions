import { LaunchType, launchCommand } from "@raycast/api";
import useToggleMic from "./helpers/useToggleMic";

export default async function ToggleMic() {
  const { toggleMic } = useToggleMic();
  const context = await toggleMic();
  await launchCommand({
    name: "mute-indicator",
    type: LaunchType.Background,
    context,
  });
}
