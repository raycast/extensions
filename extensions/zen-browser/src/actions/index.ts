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

export async function openHistoryTab(url: string): Promise<boolean | string> {
  popToRoot();
  closeMainWindow({ clearRootSearch: true });

  const script = `
    tell application "Zen"
     set savedClipboard to get the clipboard
      set the clipboard to "${url}"
      activate
      repeat while not frontmost
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
      delay 0.1
      set the clipboard to savedClipboard
    end tell
  `;

  return await runAppleScript(script);
}

export async function setActiveTab(tab: Tab): Promise<void> {
  await runAppleScript(`
    tell application "Zen"
      activate
      repeat with w from 1 to count of windows
        set startTab to name of window 1
        repeat
            if name of window 1 contains "${tab.title}" then
              exit repeat
            else
              tell application "System Events" to key code 48 using control down
            end if
            if name of window 1 is startTab then exit repeat
        end repeat
      end repeat
    end tell
  `);
}
