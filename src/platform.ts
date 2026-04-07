import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";
import { getApplications, open, showToast, Toast } from "@raycast/api";

const execFileAsync = promisify(execFile);

export const WISPR_FLOW_BUNDLE_ID = "com.electron.wispr-flow";

export interface PlatformAdapter {
  getDefaultDbPath(): string;
  isWisprFlowInstalled(): Promise<boolean>;
  openWisprFlow(url: string): Promise<boolean>;
}

class MacOSPlatform implements PlatformAdapter {
  getDefaultDbPath(): string {
    return join(
      homedir(),
      "Library",
      "Application Support",
      "Wispr Flow",
      "flow.sqlite",
    );
  }

  async isWisprFlowInstalled(): Promise<boolean> {
    const apps = await getApplications();
    return apps.some(({ bundleId }) => bundleId === WISPR_FLOW_BUNDLE_ID);
  }

  async openWisprFlow(url: string): Promise<boolean> {
    try {
      await open(url, WISPR_FLOW_BUNDLE_ID);
      return true;
    } catch {
      await showOpenFailureToast();
      return false;
    }
  }
}

class WindowsPlatform implements PlatformAdapter {
  getDefaultDbPath(): string {
    return join(
      homedir(),
      "AppData",
      "Roaming",
      "Wispr Flow",
      "flow.sqlite",
    ).replace(/\\/g, "/");
  }

  async isWisprFlowInstalled(): Promise<boolean> {
    const appPathMap = await getWindowsAppPathMap();
    if (appPathMap.has("wispr flow") || appPathMap.has("wisprflow")) {
      return true;
    }

    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) {
      return false;
    }

    return existsSync(join(localAppData, "WisprFlow", "Wispr Flow.exe"));
  }

  async openWisprFlow(url: string): Promise<boolean> {
    try {
      await open(url);
      return true;
    } catch {
      await showOpenFailureToast();
      return false;
    }
  }
}

async function showOpenFailureToast(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Could not open Wispr Flow",
    message: "Please open Wispr Flow manually.",
  });
}

export async function getWindowsAppPathMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const ps = [
      "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
      "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
    ].join("','");
    const script = `Get-ItemProperty '${ps}' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayIcon } | ForEach-Object { $icon = $_.DisplayIcon -replace '(,[^,]+)?$' -replace '"',''; if ($icon -match '\\.exe$' -and (Test-Path $icon)) { "$([io.path]::GetFileNameWithoutExtension($icon).ToLower())|$icon" } } | Sort-Object -Unique`;
    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      script,
    ]);
    for (const line of stdout.trim().split(/\r?\n/)) {
      const [name, path] = line.split("|");
      if (name && path) map.set(name, path);
    }
  } catch {
    return map;
  }

  return map;
}

export function createPlatformAdapter(): PlatformAdapter {
  return process.platform === "win32"
    ? new WindowsPlatform()
    : new MacOSPlatform();
}

export const platform: PlatformAdapter = createPlatformAdapter();
