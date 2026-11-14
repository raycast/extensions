import { getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";

export interface Preferences {
  vaultPath: string;
}

export function getPreferences(): Preferences {
  const { vaultPath } = getPreferenceValues<Preferences>();
  const path = vaultPath?.trim().replace(/^~(?=\/|$)/, homedir());
  if (!path || !isAbsolute(path))
    throw new Error(
      "Please set an absolute path to your Obsidian vault in extension preferences",
    );
  return { vaultPath: resolve(path) };
}
