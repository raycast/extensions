import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { getApplications, open, showToast, Toast } from "@raycast/api";

export const WISPR_FLOW_BUNDLE_ID = "com.electron.wispr-flow";

export interface PlatformAdapter {
  getDefaultDbPath(): string;
  isWisprFlowInstalled(): Promise<boolean>;
  openWisprFlow(url: string): Promise<void>;
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

  async openWisprFlow(url: string): Promise<void> {
    await open(url, WISPR_FLOW_BUNDLE_ID);
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
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) return false;
    return existsSync(join(localAppData, "WisprFlow", "Wispr Flow.exe"));
  }

  async openWisprFlow(url: string): Promise<void> {
    try {
      await open(url);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open Wispr Flow",
        message: "Please open Wispr Flow manually.",
      });
    }
  }
}

export function createPlatformAdapter(): PlatformAdapter {
  return process.platform === "win32"
    ? new WindowsPlatform()
    : new MacOSPlatform();
}

export const platform: PlatformAdapter = createPlatformAdapter();
