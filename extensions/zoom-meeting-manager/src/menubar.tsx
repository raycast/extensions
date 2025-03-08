import { MenuBarExtra, open } from "@raycast/api";
import { ReadConfig } from "./components";
import { preferences } from "./preferences";
import { Meeting } from "./types";

export default function Command() {
  if (!preferences.enableMenubar) {
    return;
  }
  const config: Array<Meeting> = JSON.parse(ReadConfig());
  if (!config) {
    return (
      <MenuBarExtra icon="https://st1.zoom.us/zoom.ico" tooltip="Your Zoom meetings">
        <MenuBarExtra.Item title="No meeting ids in config" />
      </MenuBarExtra>
    );
  }
  return (
    <MenuBarExtra icon="https://st1.zoom.us/zoom.ico" tooltip="Your Zoom meetings">
      <MenuBarExtra.Item title="Join a zoom meeting" />
      {config.map((meeting) => (
        <MenuBarExtra.Item
          title={meeting.title}
          key={meeting.id}
          onAction={async () => {
            await open(`zoommtg://zoom.us/join?confno=${meeting.id}`, "us.zoom.xos");
          }}
        />
      ))}
    </MenuBarExtra>
  );
}
