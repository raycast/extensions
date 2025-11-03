import { Clipboard, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { SEARCH_ENGINE } from "../constants";
import { Preferences, Shortcut } from "../interfaces";
import { getNewTabShortcut } from "../util";

/**
 * Activates Zen browser and waits for it to become frontmost.
 * Returns the AppleScript code for the activation and wait logic.
 */
function getZenActivationScript(activateRaycastFirst = false): string {
  const raycastActivation = activateRaycastFirst ? 'tell application "Raycast" to activate\n' : "";
  return `${raycastActivation}tell application "Zen" to activate
    tell application "System Events"
      repeat 10 times
        if frontmost of process "Zen" then exit repeat
        delay 0.1
      end repeat`;
}

async function executeKeystrokeInZen(
  keystroke: string,
  modifiers: string[] = [],
  activateRaycastFirst = false,
): Promise<void> {
  const modifierScript = modifiers.length > 0 ? ` using {${modifiers.map((m) => `${m} down`).join(", ")}}` : "";
  const script = `
    ${getZenActivationScript(activateRaycastFirst)}
      keystroke "${keystroke}"${modifierScript}
    end tell
  `;

  await runAppleScript(script);
}

export async function runShortcut(shortcut: Shortcut) {
  const modifierScript = shortcut.modifiers.map((m) => `${m} down`).join(", ");
  const appleScriptShortcut = `keystroke "${shortcut.key}" using {${modifierScript}}`;

  const script = `
    ${getZenActivationScript(true)}
  	${appleScriptShortcut}
    end tell
  `;

  await runAppleScript(script);
}

export async function openNewTab(queryText: string | null | undefined) {
  await Clipboard.copy(`${SEARCH_ENGINE[getPreferenceValues<Preferences>().searchEngine.toLowerCase()]}${queryText}`);
  const script = `
    ${getZenActivationScript(true)}

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

export async function openNewWindow() {
  await executeKeystrokeInZen("n", ["command"]);
}

export async function openNewPrivateWindow() {
  await executeKeystrokeInZen("p", ["command", "shift"]);
}
