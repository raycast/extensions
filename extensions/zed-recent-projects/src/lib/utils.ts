import util from "util";
import { existsSync } from "fs";
import { execFile } from "child_process";
import { join } from "path";
import { zedBuild } from "./preferences";

export const execFilePromise = util.promisify(execFile);

export function exists(p: string) {
  try {
    return existsSync(new URL(p));
  } catch {
    return false;
  }
}

export function execWindowsZed(args: string[]) {
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const windowsPath = join(localAppData, "Programs", zedBuild, "bin", "zed");
    return execFilePromise(windowsPath, args);
  } else {
    return execFilePromise("zed", args);
  }
}

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";
