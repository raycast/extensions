import fs from "fs";
import { getApplications, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { homedir } from "os";
import { execWithCleanEnv, isMac, isWindows } from "./utils";
import { zedBuild } from "./preferences";

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

export async function closeZedWindow(windowTitle: string, bundleId: ZedBundleId): Promise<boolean> {
  const processName = ZedProcessNameMapping[bundleId];
  const escapedTitle = windowTitle.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const script = `
tell application "System Events"
  tell process "${processName}"
    repeat with w in (every window)
      if name of w contains "${escapedTitle}" then
        click (first button of w whose description is "close button")
        return "true"
      end if
    end repeat
    return "false"
  end tell
end tell
`;

  try {
    const result = await runAppleScript(script);
    return result === "true";
  } catch (error) {
    console.error("Failed to close Zed window:", error);
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
