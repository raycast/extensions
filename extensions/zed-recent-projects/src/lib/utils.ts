import util from "util";
import { existsSync } from "fs";
import { execFile } from "child_process";

export const execFilePromise = util.promisify(execFile);

export function exists(p: string) {
  try {
    return existsSync(new URL(p));
  } catch {
    return false;
  }
}
