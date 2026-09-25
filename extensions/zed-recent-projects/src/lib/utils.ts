import util from "util";
import path from "path";
import { existsSync } from "fs";
import { execFile, execFileSync } from "child_process";
import { homedir, userInfo } from "os";

export const execFilePromise = util.promisify(execFile);

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";

export function shellEscape(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

const POSIX_SHELL_NAMES = new Set(["sh", "bash", "zsh", "dash", "ksh", "ash", "mksh"]);

/**
 * Returns true when the given shell path's basename is a known POSIX shell
 * whose `-lc` invocation accepts the POSIX-style command produced by
 * `shellEscape`. Non-POSIX shells (fish, nu, elvish, xonsh, pwsh, ...) need
 * to be replaced with a POSIX shell before running such a command.
 */
export function isPosixShell(shellPath: string): boolean {
  if (!shellPath) {
    return false;
  }
  return POSIX_SHELL_NAMES.has(path.basename(shellPath));
}

/**
 * Gets the user's default shell from the system.
 * Uses dscl (Directory Service) on macOS to read the UserShell attribute.
 * Falls back to /bin/zsh if unable to determine.
 */
function getUserShell(): string {
  try {
    const username = userInfo().username;
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
 * Builds the `env -i ...` argv for running `command args` inside an
 * interactive login shell. Pulled out of `execWithCleanEnv` so the flags
 * (`-ilc`, not just `-lc`) are unit-testable without spawning a real shell.
 *
 * Login-only (`-l`) is not enough: zsh only sources `~/.zshrc` for
 * *interactive* shells, and that's where most users actually set PATH (nvm,
 * pyenv, oh-my-zsh, manual edits) rather than in `~/.zprofile`. So we run
 * login *and* interactive (`-i`), matching what a normal terminal - and Zed
 * itself when launched from Finder - resolves.
 *
 * Non-POSIX shells (fish, nushell, elvish, xonsh, pwsh, ...) don't accept
 * the POSIX-style quoted command built here, so the caller should pass
 * `/bin/zsh` instead of the user's actual shell in that case. The user's
 * profile still gets sourced, just by a POSIX shell instead of their own.
 */
export function buildCleanEnvArgs(command: string, args: string[], posixShell: string, home: string): string[] {
  const escapedArgs = args.map(shellEscape).join(" ");
  const shellCommand = `${shellEscape(command)} ${escapedArgs}`;

  return [
    "-i",
    `HOME=${home}`,
    `USER=${userInfo().username}`,
    posixShell,
    // -i = interactive shell (sources rc), -l = login shell (sources profile), -c = execute command
    "-ilc",
    shellCommand,
  ];
}

/**
 * Executes a command with a clean environment using `env -i` and an
 * interactive login shell (see `buildCleanEnvArgs`).
 * This ensures child processes don't inherit Raycast's environment variables,
 * while still resolving the user's PATH the same way a fresh terminal does.
 */
export async function execWithCleanEnv(command: string, args: string[]): Promise<void> {
  const userShell = getUserShell();
  const posixShell = isPosixShell(userShell) ? userShell : "/bin/zsh";

  await execFilePromise("env", buildCleanEnvArgs(command, args, posixShell, process.env.HOME || homedir()));
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
