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
 * Safari web apps share one process called "Web App".
 * Check which web app is currently running by its file path.
 * Returns the path of the running web app, or null if none is running.
 */
async function getRunningWebAppPath(): Promise<string | null> {
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        set procList to (every process whose name is "Web App")
        if (count of procList) > 0 then
          set p to item 1 of procList
          return (file of p) as string
        else
          return ""
        end if
      end tell
    `);
    if (!result) return null;
    // Convert "file Macintosh HD:Users:...:YouTube Web.app:" to path
    const path = result
      .replace(/^file Macintosh HD:/, "/")
      .replace(/:$/, "")
      .replace(/:/g, "/");
    return path;
  } catch {
    return null;
  }
}

/**
 * Quit the running "Web App" process if it exists.
 */
async function quitWebApp(): Promise<void> {
  try {
    await runAppleScript(`
      tell application "System Events"
        set procList to (every process whose name is "Web App")
        if (count of procList) > 0 then
          tell item 1 of procList
            set frontmost to true
          end tell
        end if
      end tell
      delay 0.5
      do shell script "pkill -x 'Web App'"
      delay 1
    `);
  } catch {
    // ignore — process might not exist
  }
}

/**
 * Open the YouTube web app.
 * If YouTube web app is already running, just focus the window.
 * If a different web app (e.g. Crunchyroll) is running, quit it first.
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
    const runningPath = await getRunningWebAppPath();
    if (runningPath && runningPath.includes("YouTube")) {
      // Same web app already running — just focus, don't reload
      await runAppleScript(`do shell script "open -a \\"${escapedPath}\\""`);
      return;
    }
    // Different web app or none running — quit if needed, then open
    if (runningPath) {
      await quitWebApp();
    }
    await runAppleScript(
      `do shell script "open -a \\"${escapedPath}\\" \\"https://www.youtube.com\\""`,
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } catch {
    await openInBrowser("https://www.youtube.com");
  }
}

/**
 * Open the YouTube web app and navigate to a URL.
 * Used by Search/Trending/History — always navigates to the URL.
 * If same app is running, navigates without restarting.
 * If different app is running, quits it first.
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
    const runningPath = await getRunningWebAppPath();
    if (runningPath && runningPath.includes("YouTube")) {
      // Same web app already running — navigate to URL without restarting
      await runAppleScript(
        `do shell script "open -a \\"${escapedPath}\\" \\"${url}\\""`,
      );
      return;
    }
    // Different web app or none running — quit if needed, then open
    if (runningPath) {
      await quitWebApp();
    }
    await runAppleScript(
      `do shell script "open -a \\"${escapedPath}\\" \\"${url}\\""`,
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } catch {
    await openInBrowser(url);
  }
}

/**
 * Trigger video fullscreen by sending the "f" key to the web app.
 * This is the standard HTML5 video player fullscreen shortcut on both
 * YouTube and Crunchyroll. If you use Vimium, add an exception for the
 * video site domain so "f" reaches the player instead of Vimium.
 */
export async function enterFullscreen(): Promise<void> {
  try {
    await runAppleScript(`
      tell application "System Events"
        set procList to (every process whose name is "Web App")
        if (count of procList) > 0 then
          tell item 1 of procList
            set frontmost to true
            delay 0.5
            keystroke "f"
          end tell
        end if
      end tell
    `);
  } catch {
    // ignore
  }
}

/**
 * Check if the YouTube web app is currently running.
 */
export async function isYouTubeRunning(): Promise<boolean> {
  const runningPath = await getRunningWebAppPath();
  return runningPath !== null && runningPath.includes("YouTube");
}

/**
 * Focus the YouTube web app if it's already running.
 * If not running, open it with the given URL.
 * Used by Continue Watching — doesn't disrupt playback if already playing.
 */
export async function focusOrOpenYouTube(url?: string): Promise<void> {
  const installed = await isWebAppInstalled();
  if (!installed) {
    await openInBrowser(url ?? "https://www.youtube.com");
    return;
  }

  const escapedPath = WEB_APP_PATH.replace(/"/g, '\\"');
  try {
    const runningPath = await getRunningWebAppPath();
    if (runningPath && runningPath.includes("YouTube")) {
      // Same web app already running — just focus, don't reload
      await runAppleScript(`do shell script "open -a \\"${escapedPath}\\""`);
      return;
    }
    // Different web app or none running — quit if needed, then open with URL
    if (runningPath) {
      await quitWebApp();
    }
    await runAppleScript(
      `do shell script "open -a \\"${escapedPath}\\" \\"${url ?? "https://www.youtube.com"}\\""`,
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } catch {
    await openInBrowser(url ?? "https://www.youtube.com");
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

/**
 * Check if "Allow JavaScript from Apple Events" is enabled in Safari.
 * This is required to fetch real watch history and continue-watching from
 * the user's authenticated YouTube session.
 */
export async function isSafariJSEnabled(): Promise<boolean> {
  try {
    const result = await runAppleScript(`
      tell application "Safari"
        if (count of windows) is 0 then
          make new document
        end if
        do JavaScript "1+1" in current tab of front window
      end tell
    `);
    // Safari returns "2.0" not "2"
    return result === "2" || result === "2.0" || parseFloat(result) === 2;
  } catch {
    return false;
  }
}

/**
 * Open Safari Settings to the Advanced tab so the user can enable
 * "Allow JavaScript from Apple Events".
 */
export async function openSafariSettings(): Promise<void> {
  await runAppleScript(`
    tell application "Safari"
      activate
      delay 1
    end tell
    tell application "System Events"
      keystroke "," using {command down}
    end tell
  `);
}

export interface HistoryVideo {
  id: string;
  title: string;
  channel: string;
  url: string;
  thumbnail: string;
  duration: string;
}

/**
 * Fetch real watch history from YouTube using Safari's authenticated session.
 * Opens a background tab, moves the window off-screen while fetching, then
 * restores position and closes the tab.
 */
export async function fetchRealHistory(): Promise<HistoryVideo[]> {
  const script = `
    tell application "Safari"
      if (count of windows) is 0 then
        make new document
      end if
      tell front window
        set histTab to (make new tab with properties {URL:"https://www.youtube.com/feed/history"})
      end tell
      tell application "System Events"
        tell process "Safari"
          set originalPos to position of front window
          set position of front window to {-2000, -2000}
        end tell
      end tell
      delay 3
      set jsResult to do JavaScript "
        (function() {
          var videos = [];
          var items = document.querySelectorAll('yt-lockup-view-model');
          items.forEach(function(item, i) {
            if (i >= 20) return;
            var link = item.querySelector('a[href*=watch]');
            var titleEl = item.querySelector('a.ytLockupMetadataViewModelTitle, h3 a, h3');
            var metaEl = item.querySelector('yt-content-metadata-view-model');
            var badgeEl = item.querySelector('yt-thumbnail-badge-view-model');
            var href = link ? link.href : '';
            var videoId = '';
            if (href) {
              var match = href.match(/v=([^&]+)/);
              if (match) videoId = match[1];
            }
            if (videoId) {
              videos.push({
                id: videoId,
                title: titleEl ? titleEl.textContent.trim() : '',
                channel: metaEl ? metaEl.textContent.trim().split('•')[0].trim() : '',
                url: 'https://www.youtube.com/watch?v=' + videoId,
                thumbnail: 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg',
                duration: badgeEl ? badgeEl.textContent.trim() : ''
              });
            }
          });
          return JSON.stringify(videos);
        })();
      " in histTab
      close histTab
      tell application "System Events"
        tell process "Safari"
          set position of front window to originalPos
        end tell
      end tell
      return jsResult
    end tell
  `;
  const result = await runAppleScript(script);
  return JSON.parse(result) as HistoryVideo[];
}

/**
 * Fetch the continue-watching video URL from YouTube homepage.
 * Opens a background tab, moves window off-screen, then restores and closes.
 */
export async function fetchContinueWatchingUrl(): Promise<string | null> {
  const script = `
    tell application "Safari"
      if (count of windows) is 0 then
        make new document
      end if
      tell front window
        set homeTab to (make new tab with properties {URL:"https://www.youtube.com"})
      end tell
      tell application "System Events"
        tell process "Safari"
          set originalPos to position of front window
          set position of front window to {-2000, -2000}
        end tell
      end tell
      delay 5
      set jsResult to do JavaScript "
        (function() {
          var shelves = document.querySelectorAll('ytd-rich-shelf-renderer, ytd-shelf-renderer, yt-rich-shelf-renderer');
          for (var s = 0; s < shelves.length; s++) {
            var title = shelves[s].querySelector('#title, .title, h2');
            if (title && /continue watching|watch again/i.test(title.textContent)) {
              var link = shelves[s].querySelector('a[href*=watch]');
              if (link && link.href) return link.href;
            }
          }
          var links = document.querySelectorAll('a[href*=watch]');
          if (links.length > 0) return links[0].href;
          return '';
        })();
      " in homeTab
      close homeTab
      tell application "System Events"
        tell process "Safari"
          set position of front window to originalPos
        end tell
      end tell
      return jsResult
    end tell
  `;
  const result = await runAppleScript(script);
  return result || null;
}
