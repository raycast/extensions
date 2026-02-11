import util from "util";
import { existsSync } from "fs";
import { execFile, execFileSync } from "child_process";
import { homedir } from "os";

export const execFilePromise = util.promisify(execFile);

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";

export function shellEscape(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Gets the user's default shell from the system.
 * Uses dscl (Directory Service) on macOS to read the UserShell attribute.
 * Falls back to /bin/zsh if unable to determine.
 */
function getUserShell(): string {
  try {
    const result = execFileSync("dscl", [".", "-read", `/Users/${process.env.USER}`, "UserShell"], {
      encoding: "utf8",
    });
    // Output format: "UserShell: /path/to/shell"
    const match = result.match(/UserShell:\s*(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch {
    // Fall through to default
  }
  return "/bin/zsh";
}

/**
 * Executes a command with a clean environment using `env -i` and a login shell.
 * This ensures child processes don't inherit Raycast's environment variables.
 *
 * The approach:
 * 1. `env -i` starts with an empty environment
 * 2. Only HOME is passed (required for login shell to find profile files)
 * 3. User's default shell runs as login shell, sourcing their profile
 *
 * This gives the command the same environment as a fresh terminal window.
 */
export async function execWithCleanEnv(command: string, args: string[]): Promise<void> {
  const escapedArgs = args.map(shellEscape).join(" ");
  const shellCommand = `${shellEscape(command)} ${escapedArgs}`;

  const userShell = getUserShell();

  // Use env -i to start with empty environment, then login shell for user's profile
  // -l = login shell (sources profile), -c = execute command
  // This works for bash, zsh, fish, and most POSIX shells
  await execFilePromise("env", ["-i", `HOME=${process.env.HOME || homedir()}`, userShell, "-lc", shellCommand]);
}

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
