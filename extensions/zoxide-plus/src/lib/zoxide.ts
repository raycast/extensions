import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const CANDIDATES = ["/opt/homebrew/bin/zoxide", "/usr/local/bin/zoxide"];

export const zoxidePath = CANDIDATES.find(existsSync);

const exec = promisify(execFile);

export async function addPath(path: string): Promise<void> {
  if (!zoxidePath) {
    throw new Error("zoxide not found. Install with: brew install zoxide");
  }
  await exec(zoxidePath, ["add", path]);
}
