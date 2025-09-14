import { Clipboard, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { SEARCH_ENGINE } from "../constants";
import { Preferences, Shortcut, Tab } from "../interfaces";
import { getNewTabShortcut } from "../util";

export async function runShortcut(shortcut: Shortcut) {
  const modifierScript = shortcut.modifiers.map((m) => `${m} down`).join(", ");
  const appleScriptShortcut = `keystroke "${shortcut.key}" using {${modifierScript}}`;

  // Activate Raycast to reset window focus when Zen is already frontmost
  const script = `
    tell application "Raycast" to activate
    tell application "Zen" to activate
    tell application "System Events"
	    repeat 10 times
				if frontmost of process "Zen" then exit repeat
    		delay 0.1
     	end repeat
  	${appleScriptShortcut}
    end tell
  `;

  await runAppleScript(script);
}

export async function openNewTab(queryText: string | null | undefined) {
  await Clipboard.copy(`${SEARCH_ENGINE[getPreferenceValues<Preferences>().searchEngine.toLowerCase()]}${queryText}`);
  const script = `
    tell application "Raycast" to activate
    tell application "Zen" to activate

    tell application "System Events"
      repeat 10 times
				if frontmost of process "Zen" then exit repeat
        delay 0.1
    	end repeat

      ${getNewTabShortcut()}
      delay 0.1
      keystroke "a" using {command down}
      key code 51
      keystroke "v" using {command down}
      key code 36
    end tell
  `;

  await runAppleScript(script);
}

export async function openTabFromUrl(url: string) {
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

  await runAppleScript(script);
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
