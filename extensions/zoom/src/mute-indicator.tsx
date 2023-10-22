import { LaunchProps, LaunchType, MenuBarExtra } from "@raycast/api";
import { Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import useToggleMic from "./helpers/useToggleMic";
import useMicStatus from "./helpers/useMicStatus";

export default function MuteIndicator(props: LaunchProps) {
  const context = props.launchContext;
  const { toggleMic } = useToggleMic();
  const { isLoading, data, mutate } = usePromise(useMicStatus, [], {
    execute: props.launchType === LaunchType.UserInitiated || context === undefined,
  });
  const isMicMuted = context?.isMicMuted ?? data?.isMicMuted;
  return (
    <MenuBarExtra isLoading={isLoading} icon={isMicMuted ? Icon.MicrophoneDisabled : Icon.Microphone}>
      <MenuBarExtra.Item
        title="Toggle Mic"
        onAction={async () => {
          const toggleRes = await toggleMic();
          mutate(undefined, { optimisticUpdate: () => toggleRes });
        }}
      />
    </MenuBarExtra>
  );
}
