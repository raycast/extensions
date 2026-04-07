import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { existsSync } from "fs";
import { platform } from "./platform";

export { WISPR_FLOW_BUNDLE_ID } from "./platform";

export function getDbPath(): string {
  const { databasePath } = getPreferenceValues<Preferences>();
  return databasePath && databasePath.trim() !== ""
    ? databasePath
    : platform.getDefaultDbPath();
}

export function dbExists(): boolean {
  return existsSync(getDbPath());
}

export async function isWisprFlowInstalled(): Promise<boolean> {
  return platform.isWisprFlowInstalled();
}

export async function ensureWisprFlowInstalled(): Promise<boolean> {
  const installed = await isWisprFlowInstalled();
  if (!installed) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Wispr Flow is not installed",
      message: "Download from wisprflow.ai",
      primaryAction: {
        title: "Download Wispr Flow",
        onAction: async (toast) => {
          await open("https://wisprflow.ai");
          await toast.hide();
        },
      },
    });
  }
  return installed;
}

export async function openWisprFlow(url: string): Promise<boolean> {
  return platform.openWisprFlow(url);
}

/**
 * Escapes a string for safe use in SQLite queries.
 * Doubles single quotes (SQL standard escaping) and removes null bytes.
 */
export function escapeSQL(value: string, maxLength = 1000): string {
  return value.slice(0, maxLength).replace(/\0/g, "").replace(/'/g, "''");
}

/**
 * Validates UUID format to prevent injection in ID fields.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUUID(id: string): string {
  if (!UUID_REGEX.test(id)) {
    throw new Error("Invalid UUID");
  }
  return id;
}

/**
 * Executes a write SQL statement (INSERT/UPDATE/DELETE).
 */
export async function writeSQL(sql: string): Promise<void> {
  const dbPath = getDbPath();

  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(dbPath);
    try {
      db.exec(sql);
    } finally {
      db.close();
    }
    return;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    const isMissingNodeSqlite =
      code === "ERR_UNKNOWN_BUILTIN_MODULE" ||
      code === "ERR_MODULE_NOT_FOUND" ||
      (error instanceof Error && error.message.includes("node:sqlite"));

    if (!isMissingNodeSqlite) {
      throw error;
    }
  }

  const { execFileSync } = await import("node:child_process");
  try {
    execFileSync("sqlite3", [dbPath], {
      input: sql,
      encoding: "utf-8",
      timeout: 5000,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        "sqlite3 not found and node:sqlite is unavailable. Please ensure sqlite3 is installed and in your PATH.",
      );
    }

    throw error;
  }
}
