import { ActionPanel, Action, List } from "@raycast/api";
import { spawnSync } from "child_process";
import { v4 as uuidv4 } from "uuid";

class Mode {
  constructor(public id?: string, public name?: string, public url?: string) {
    this.id = uuidv4();
    this.name = name ?? "";
    this.url = url ?? "zenmode://";
  }
}

function retrieveModes() {
  const out = spawnSync("defaults read com.pradeepb28.zenmodeforraycast listOfModes", { shell: true });
  const result = String(out.output[1]).trim();

  const modeItems = result.split(",");

  const modes: Mode[] = [];

  for (const modeItem of modeItems) {
    const mode = new Mode();

    if (modeItem.startsWith("(\n")) {
      const filteredModeItem = modeItem.replace("(\n", "").trim().replaceAll('"', "").replace("\n)", "");

      mode.name = filteredModeItem;
      mode.url = "zenmode://" + filteredModeItem.replace(/ /g, "").toLowerCase();
    } else if (modeItem.endsWith("\n)")) {
      const filteredModeItem = modeItem.replace("\n)", "").replace("\n", "").trim().replaceAll('"', "");

      mode.name = filteredModeItem;
      mode.url = "zenmode://" + filteredModeItem.replace(/ /g, "").toLowerCase();
    } else {
      const filteredModeItem = modeItem.replace("\n", "").trim().replaceAll('"', "");

      mode.name = filteredModeItem;
      mode.url = "zenmode://" + filteredModeItem.replace(/ /g, "").toLowerCase();
    }

    modes.push(mode);
  }

  return modes;
}

export default function Command() {
  const modes = retrieveModes();

  if (modes.length > 0) {
    return (
      <List isLoading={false} searchBarPlaceholder="Search by mode name...">
        {modes.map((mode) => (
          <List.Item
            key={mode.id}
            title={mode.name!}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={mode.url!} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  } else {
    return (
      <List isLoading={false}>
        <List.Item
          key="1"
          title="No modes available. Double click or tap enter here to download the app."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://zenmode.carrd.co" />
            </ActionPanel>
          }
        />
      </List>
    );
  }
}
