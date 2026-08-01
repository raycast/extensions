// Helper to open YouTube in the Safari web app with auto PiP

import { runAppleScript } from "@raycast/utils";
import { homedir } from "os";

const WEB_APP_PATH = `${homedir()}/Applications/YouTube.app`;

/**
 * Check if the YouTube Safari web app exists
 */
export async function isWebAppInstalled(): Promise<boolean> {
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        return exists file "${WEB_APP_PATH}"
      end tell
    `);
    return result === "true";
  } catch {
    return false;
  }
}

/**
 * Create the YouTube Safari web app if it doesn't exist
 */
export async function createWebApp(): Promise<void> {
  await runAppleScript(`
    -- Launch Safari if not running
    tell application "System Events"
      if not (exists process "Safari") then
        do shell script "open -a Safari"
        delay 3
      end if
    end tell

    tell application "Safari"
      activate
      delay 1
      if (count of windows) is 0 then
        make new document with properties {URL:"https://www.youtube.com"}
      else
        tell front window
          set current tab to (make new tab with properties {URL:"https://www.youtube.com"})
        end tell
      end if
    end tell

    delay 5

    tell application "System Events"
      tell process "Safari"
        click menu item "Add to Dock…" of menu "File" of menu bar item "File" of menu bar 1
      end tell
    end tell
  `);
}

async function openInBrowser(url: string): Promise<void> {
  await runAppleScript(`do shell script "open \\"${url}\\""`);
}

/**
 * Bring the Web App process to front and optionally send spacebar to auto-play.
 * Safari web apps share a single process called "Web App" — opening a
 * specific .app file loads that URL in the shared process.
 */
async function bringToFrontAndPlay(autoPlay: boolean): Promise<void> {
  await runAppleScript(`
    tell application "System Events"
      set procList to (every process whose name is "Web App")
      if (count of procList) > 0 then
        tell item 1 of procList
          set frontmost to true
        end tell
      end if
    end tell
  `);
  if (autoPlay) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await runAppleScript(`
      tell application "System Events"
        set procList to (every process whose name is "Web App")
        if (count of procList) > 0 then
          tell item 1 of procList
            keystroke space
          end tell
        end if
      end tell
    `);
  }
}

/**
 * Open the YouTube web app (resumes last watched video).
 * Falls back to browser if web app is not installed.
 */
export async function openYouTube(): Promise<void> {
  const installed = await isWebAppInstalled();
  if (!installed) {
    await openInBrowser("https://www.youtube.com");
    return;
  }

  const escapedPath = WEB_APP_PATH.replace(/"/g, '\\"');
  try {
    await runAppleScript(`do shell script "open -a \\"${escapedPath}\\""`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await bringToFrontAndPlay(true);
  } catch {
    await openInBrowser("https://www.youtube.com");
  }
}

/**
 * Open the YouTube web app and navigate to a URL.
 * Falls back to browser if web app is not installed.
 */
export async function openYouTubeURL(url: string): Promise<void> {
  const installed = await isWebAppInstalled();
  if (!installed) {
    await openInBrowser(url);
    return;
  }

  const escapedPath = WEB_APP_PATH.replace(/"/g, '\\"');
  try {
    await runAppleScript(
      `do shell script "open -a \\"${escapedPath}\\" \\"${url}\\""`,
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await bringToFrontAndPlay(false);
  } catch {
    await openInBrowser(url);
  }
}

/**
 * Check if the AutoPiP Safari extension is installed
 */
export async function isAutoPiPInstalled(): Promise<boolean> {
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        return exists file "/Applications/AutoPiP.app"
      end tell
    `);
    return result === "true";
  } catch {
    return false;
  }
}
