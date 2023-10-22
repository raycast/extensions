import { runAppleScript } from "@raycast/utils";

export default async function useMicStatus() {
  const res = await runAppleScript(`
try
  with timeout of 1 second
    tell application "System Events"

      if not (application process "zoom.us" exists) then
        return "true"
      end if

      tell application process "zoom.us"
        set meetingMenu to menu 1 of menu bar item "Meeting" of menu bar 1
        if exists menu item "Mute Audio" of meetingMenu then
          return "false"
        else
         return "true"
        end if
      end tell
    end tell
  end timeout
on error
  return "true"
end try
`);
  return { isMicMuted: res === "true" };
}
