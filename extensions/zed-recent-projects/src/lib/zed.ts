import { getApplications, getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { zedBuild } from "./preferences";
import { isMac, isWindows } from "./utils";

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
  if (process.platform === "darwin") {
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
