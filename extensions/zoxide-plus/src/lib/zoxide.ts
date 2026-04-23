import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";

function findZoxidePath(): string | undefined {
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

export const zoxidePath = findZoxidePath();

const exec = promisify(execFile);

export async function addPath(path: string): Promise<void> {
  if (!zoxidePath) {
    throw new Error("zoxide not found. Install with: brew install zoxide");
  }
  await exec(zoxidePath, ["add", path]);
}
