import util from "util";
import { existsSync } from "fs";
import { execFile, execFileSync } from "child_process";
import { homedir, userInfo } from "os";

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
    const username = process.env.USER || userInfo().username;
    const result = execFileSync("dscl", [".", "-read", `/Users/${username}`, "UserShell"], {
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
 * 3. A POSIX-compatible login shell (zsh or bash) sources the user's profile,
 *    then execs the target command directly — avoiding shell-escaping issues
 *    with non-POSIX shells like fish.
 *
 * This gives the command the same environment as a fresh terminal window.
 */
export async function execWithCleanEnv(command: string, args: string[]): Promise<void> {
  const userShell = getUserShell();

  // If the user's shell is fish (or any other non-POSIX shell), fall back to
  // /bin/zsh for the -lc invocation. Fish does not support POSIX-style quoting
  // or the `-c` flag in the same way, so we must use a POSIX shell to source
  // the profile and then exec the real command.
  const isFish = userShell.endsWith("fish");
  const posixShell = isFish ? "/bin/zsh" : userShell;

  const escapedArgs = args.map(shellEscape).join(" ");
  const shellCommand = `${shellEscape(command)} ${escapedArgs}`;

  // Use env -i to start with empty environment, then login shell for user's profile
  // -l = login shell (sources profile), -c = execute command
  await execFilePromise("env", ["-i", `HOME=${process.env.HOME || homedir()}`, posixShell, "-lc", shellCommand]);
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
