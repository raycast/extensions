import { Clipboard, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { SEARCH_ENGINE } from "../constants";
import { Preferences, Shortcut } from "../interfaces";
import { getNewTabShortcut } from "../util";

export async function runShortcut(shortcut: Shortcut) {
  const modifierScript = shortcut.modifiers.map((m) => `${m} down`).join(", ");
  const appleScriptShortcut = `keystroke "${shortcut.key}" using {${modifierScript}}`;

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
