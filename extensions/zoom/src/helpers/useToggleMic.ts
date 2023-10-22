import { runAppleScript } from "@raycast/utils";

export default function useToggleMic() {
  const toggleMic = async () => {
    const res = await runAppleScript(`
tell application "System Events" to tell process "zoom.us"
set meetingMenu to menu 1 of menu bar item "Meeting" of menu bar 1
if exists menu item "Mute Audio" of meetingMenu then
click menu item "Mute Audio" of meetingMenu
return "true"
else
click menu item "Unmute Audio" of meetingMenu
return "false"
end if
end tell
`);
    return { isMicMuted: res === "true" };
  };

  return { toggleMic };
}
