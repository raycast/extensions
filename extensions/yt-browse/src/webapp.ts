// Helper to open YouTube in the Safari web app with auto PiP

import { runAppleScript } from "@raycast/utils";
import { homedir } from "os";

const WEB_APP_PATH = `${homedir()}/Applications/YouTube.app`;
// YouTube web app bundle ID will be set after user creates it via "Add to Dock"
// We detect it dynamically, but use a common pattern
let webAppBundleId = "";

async function detectWebAppBundleId(): Promise<string> {
  if (webAppBundleId) return webAppBundleId;
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        try
          set bundleId to bundle identifier of file "${WEB_APP_PATH}"
          return bundleId
        end try
      end tell
      return ""
    `);
    webAppBundleId = result;
    return result;
  } catch {
    return "";
  }
}

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

export async function createWebApp(): Promise<void> {
  await runAppleScript(`
    tell application "Safari"
      activate
      if (count of windows) is 0 then
        make new document with properties {URL:"https://www.youtube.com"}
      else
        tell front window
          set current tab to (make new tab with properties {URL:"https://www.youtube.com"})
        end tell
      end if
    end tell
    delay 4
    tell application "System Events"
      tell process "Safari"
        click menu item "Add to Dock…" of menu "File" of menu bar item "File" of menu bar 1
      end tell
    end tell
  `);
}

export async function openYouTube(): Promise<void> {
  const escapedPath = WEB_APP_PATH.replace(/"/g, '\\"');

  await runAppleScript(`
    do shell script "open -a \\"${escapedPath}\\""
    delay 2
    tell application "System Events"
      tell process "Web App"
        set frontmost to true
      end tell
    end tell
  `);
}

export async function openYouTubeURL(url: string): Promise<void> {
  const escapedPath = WEB_APP_PATH.replace(/"/g, '\\"');
  const bundleId = await detectWebAppBundleId();

  if (bundleId) {
    await runAppleScript(`
      do shell script "open -a \\"${escapedPath}\\""
      delay 2
      tell application id "${bundleId}"
        open location "${url}"
      end tell
      delay 1
      tell application "System Events"
        tell process "Web App"
          set frontmost to true
        end tell
      end tell
    `);
  } else {
    // Fallback: just open the URL in the web app
    await runAppleScript(`
      do shell script "open -a \\"${escapedPath}\\" \\"${url}\\""
      delay 2
      tell application "System Events"
        tell process "Web App"
          set frontmost to true
        end tell
      end tell
    `);
  }
}

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
