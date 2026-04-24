import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";

export function getZoxidePath(): string | undefined {
  const { zoxidePath: customPath } = getPreferenceValues<{ zoxidePath?: string }>();
  if (customPath && existsSync(customPath)) return customPath;

  const home = homedir();
  const candidates = [
    "/opt/homebrew/bin/zoxide", // Homebrew (Apple Silicon)
    "/usr/local/bin/zoxide", // Homebrew (Intel)
    "/opt/local/bin/zoxide", // MacPorts
    `${home}/.cargo/bin/zoxide`, // Cargo
    `${home}/.nix-profile/bin/zoxide`, // Nix (single-user)
    "/run/current-system/sw/bin/zoxide", // NixOS
  ];
  return candidates.find(existsSync);
}

const exec = promisify(execFile);

export async function addPath(path: string): Promise<void> {
  const zoxidePath = getZoxidePath();
  if (!zoxidePath) {
    throw new Error("zoxide not found. Install with: brew install zoxide");
  }
  await exec(zoxidePath, ["add", path]);
}
