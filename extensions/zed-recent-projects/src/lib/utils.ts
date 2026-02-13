import util from "util";
import { existsSync } from "fs";
import { execFile, execFileSync } from "child_process";

export const execFilePromise = util.promisify(execFile);

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";

export function exists(p: string) {
  try {
    return existsSync(new URL(p));
  } catch {
    return false;
  }
}

export function getOpenWindowIds(dbPath: string): { sessionId: string | null; windowIds: Set<number> } {
  try {
    const result = execFileSync(
      "sqlite3",
      [dbPath, "SELECT key, value FROM kv_store WHERE key IN ('session_id', 'session_window_stack')"],
      { encoding: "utf8" },
    );
    let sessionId: string | null = null;
    let windowIds = new Set<number>();

    for (const line of result.trim().split("\n")) {
      const [key, value] = line.split("|");
      if (key === "session_id") {
        sessionId = value;
      } else if (key === "session_window_stack") {
        try {
          const ids = JSON.parse(value) as number[];
          windowIds = new Set(ids);
        } catch {
          // ignore parse errors
        }
      }
    }
    return { sessionId, windowIds };
  } catch {
    return { sessionId: null, windowIds: new Set() };
  }
}
