import { Clipboard, closeMainWindow, getPreferenceValues, popToRoot } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { SEARCH_ENGINE } from "../constants";
import { Preferences, Tab } from "../interfaces";
import { getNewTabShortcut } from "../util";

export async function openNewTab(queryText: string | null | undefined): Promise<boolean | string> {
  await Clipboard.copy(`${SEARCH_ENGINE[getPreferenceValues<Preferences>().searchEngine.toLowerCase()]}${queryText}`);
  popToRoot();
  closeMainWindow({ clearRootSearch: true });

  const script = `
    tell application "Zen"
      activate
    end tell
    repeat while not application "Zen" is frontmost
      delay 0.1
    end repeat
    tell application "System Events"
      ${getNewTabShortcut()}
      delay 0.1
      keystroke "a" using {command down}
      key code 51
      keystroke "v" using {command down}
      key code 36 
    end tell
  `;

  return await runAppleScript(script);
}
