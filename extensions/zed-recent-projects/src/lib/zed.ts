import fs from "fs";
import { getApplications, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { homedir } from "os";
import { execWithCleanEnv, isMac, isWindows } from "./utils";
import { zedBuild } from "./preferences";
import { findUniqueMatchingWindowTitle } from "./zed-window-title";

export type ZedBuild = Preferences["build"];
export type ZedBundleId = "dev.zed.Zed" | "dev.zed.Zed-Preview" | "dev.zed.Zed-Dev";

const ZedBundleIdBuildMapping: Record<ZedBuild, { macos: ZedBundleId; windows: { name: string } }> = {
  Zed: { macos: "dev.zed.Zed", windows: { name: "Zed" } },
  "Zed Preview": { macos: "dev.zed.Zed-Preview", windows: { name: "Zed Preview" } },
  "Zed Dev": { macos: "dev.zed.Zed-Dev", windows: { name: "Zed Dev" } },
};

const ZedDbNameMapping: Record<ZedBuild, string> = {
  Zed: "0-stable",
  "Zed Preview": "0-preview",
  "Zed Dev": "0-dev",
};

/**
 * Known CLI installation paths for Zed on macOS.
 * The CLI can be installed via "zed: install cli" command in Zed.
 */
const ZedCliPaths: Record<ZedBuild, string> = {
  Zed: "/usr/local/bin/zed",
  "Zed Preview": "/usr/local/bin/zed-preview",
  "Zed Dev": "/usr/local/bin/zed-dev",
};

/**
 * Fallback CLI paths inside the Zed app bundle.
 */
const ZedAppCliPaths: Record<ZedBuild, string> = {
  Zed: "/Applications/Zed.app/Contents/MacOS/cli",
  "Zed Preview": "/Applications/Zed Preview.app/Contents/MacOS/cli",
  "Zed Dev": "/Applications/Zed Dev.app/Contents/MacOS/cli",
};

export function getZedBundleId(build: ZedBuild): ZedBundleId {
  return ZedBundleIdBuildMapping[build].macos;
}

export function getZedWindowsMetadata(build: ZedBuild): { name: string } {
  return ZedBundleIdBuildMapping[build].windows;
}

export function getZedDbName(build: ZedBuild): string {
  return ZedDbNameMapping[build];
}

export function getZedDbPath() {
  const preferences = getPreferenceValues<Preferences>();
  const zedBuild = preferences.build;
  if (isMac) {
    return `${homedir()}/Library/Application Support/Zed/db/${getZedDbName(zedBuild)}/db.sqlite`;
  } else {
    return `${homedir()}\\AppData\\Local\\Zed\\db\\${getZedDbName(zedBuild)}\\db.sqlite`;
  }
}

export async function getZedApp() {
  const applications = await getApplications();
  const zedBundleId = getZedBundleId(zedBuild);
  const windowsMetadata = getZedWindowsMetadata(zedBuild);

  const app = applications.find((a) => {
    if (isMac) {
      return a.bundleId === zedBundleId;
    }
    if (isWindows) {
      return a.name === windowsMetadata.name;
    }
  });

  return app;
}

/**
 * Get the path to the Zed CLI executable.
 * First checks for the installed CLI (via "zed: install cli"), then falls back to the app bundle CLI.
 * Returns null on Windows or if no CLI is found.
 */
export function getZedCliPath(build: ZedBuild = zedBuild): string | null {
  if (!isMac) {
    return null;
  }

  // Check for installed CLI first
  const installedCliPath = ZedCliPaths[build];
  if (fs.existsSync(installedCliPath)) {
    return installedCliPath;
  }

  // Fall back to CLI inside app bundle
  const appCliPath = ZedAppCliPaths[build];
  if (fs.existsSync(appCliPath)) {
    return appCliPath;
  }

  return null;
}

const ZedProcessNameMapping: Record<ZedBundleId, string> = {
  "dev.zed.Zed": "Zed",
  "dev.zed.Zed-Preview": "Zed Preview",
  "dev.zed.Zed-Dev": "Zed Dev",
};

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function listZedWindowTitles(processName: string): Promise<string[]> {
  const script = `
tell application "System Events"
  tell process "${processName}"
    set output to ""
    repeat with w in (every window)
      set output to output & (name of w) & linefeed
    end repeat
    return output
  end tell
end tell
`;

  const result = await runAppleScript(script);
  return result
    .split(/\r?\n/)
    .map((title) => title.trim())
    .filter(Boolean);
}

function zedWindowActionScript(action: "raise" | "close"): { actionLine: string; activate: string } {
  switch (action) {
    case "raise":
      return { actionLine: `perform action "AXRaise" of w`, activate: `\n    set frontmost to true` };
    case "close":
      return { actionLine: `click (first button of w whose description is "close button")`, activate: "" };
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unhandled Zed window action: ${_exhaustive}`);
    }
  }
}

async function actOnZedWindowByName(
  processName: string,
  windowName: string,
  action: "raise" | "close",
): Promise<boolean> {
  const escapedName = escapeAppleScriptString(windowName);
  const { actionLine, activate } = zedWindowActionScript(action);

  const script = `
tell application "System Events"
  tell process "${processName}"${activate}
    repeat with w in (every window)
      if name of w is "${escapedName}" then
        ${actionLine}
        return "true"
      end if
    end repeat
    return "false"
  end tell
end tell
`;

  const result = await runAppleScript(script);
  return result === "true";
}

async function withUniqueZedWindow(
  projectTitle: string,
  bundleId: ZedBundleId,
  projectPath: string | undefined,
  action: "raise" | "close",
): Promise<boolean> {
  const processName = ZedProcessNameMapping[bundleId];
  const titles = await listZedWindowTitles(processName);
  const match = findUniqueMatchingWindowTitle(titles, projectTitle, projectPath);
  if (!match) {
    return false;
  }
  return actOnZedWindowByName(processName, match, action);
}

export async function closeZedWindow(
  windowTitle: string,
  bundleId: ZedBundleId,
  projectPath?: string,
): Promise<boolean> {
  try {
    return await withUniqueZedWindow(windowTitle, bundleId, projectPath, "close");
  } catch (error) {
    console.error("Failed to close Zed window:", error);
    return false;
  }
}

/**
 * Bring an already-open Zed window to the front instead of opening a new one.
 * Recent Zed versions open a new window for every CLI invocation, even when
 * the workspace is already open, so focusing has to go through System Events.
 *
 * Only succeeds when exactly one window uniquely matches the project title
 * (or path). Ambiguous titles return false so the caller can fall back to the CLI.
 *
 * @param windowTitle - Title of the entry whose window should be focused
 * @param bundleId - Bundle ID of the Zed build to target
 * @param projectPath - Optional workspace path used to disambiguate identical titles
 * @returns true if a matching window was found and raised
 */
export async function focusZedWindow(
  windowTitle: string,
  bundleId: ZedBundleId,
  projectPath?: string,
): Promise<boolean> {
  try {
    return await withUniqueZedWindow(windowTitle, bundleId, projectPath, "raise");
  } catch (error) {
    console.error("Failed to focus Zed window:", error);
    return false;
  }
}

/**
 * Open a workspace with multiple paths using the Zed CLI.
 * This is required for multi-folder workspaces since the URI scheme only supports a single path.
 *
 * Uses a clean environment to prevent Raycast's environment variables from
 * being inherited by Zed terminals.
 *
 * @param cliPath - Path to the Zed CLI executable
 * @param paths - Array of paths to open (supports multiple folders)
 * @param newWindow - Whether to open in a new window (default: false)
 * @returns Promise that resolves when the command completes
 */
export async function openWithZedCli(cliPath: string, paths: string[], newWindow = false): Promise<void> {
  const args = newWindow ? ["-n", ...paths] : paths;

  try {
    await execWithCleanEnv(cliPath, args);
  } catch (error) {
    console.error("Failed to open with Zed CLI:", error);
    throw error;
  }
}
