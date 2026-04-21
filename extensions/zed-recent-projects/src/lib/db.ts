import { execFilePromise, isWindows } from "./utils";
import { executeSQL } from "@raycast/utils";

// Zed Build types
export type ZedBuild = "Zed" | "Zed Preview" | "Zed Dev";

const ZedBundleIdBuildMapping: Record<ZedBuild, string> = {
  Zed: "dev.zed.Zed",
  "Zed Preview": "dev.zed.Zed-Preview",
  "Zed Dev": "dev.zed.Zed-Dev",
};

const ZedDbNameMapping: Record<ZedBuild, string> = {
  Zed: "0-stable",
  "Zed Preview": "0-preview",
  "Zed Dev": "0-dev",
};

export function getZedBundleId(build: ZedBuild): string {
  return ZedBundleIdBuildMapping[build];
}

export function getZedDbName(build: ZedBuild): string {
  return ZedDbNameMapping[build];
}

/**
 * Minimum supported WorkspaceDb schema version.
 * v34 uses remote_connections table with name/container_id fields and paths_order field.
 */
export const MIN_SUPPORTED_DB_VERSION = 34;

/**
 * Query the Zed SQLite database.
 */
export async function queryDb(dbPath: string, query: string): Promise<string> {
  try {
    if (isWindows) {
      try {
        const res = await executeSQL(dbPath, query);

        if (!res || !Array.isArray(res) || res.length === 0) {
          return "";
        }

        const firstRow = res[0] as Record<string, unknown>;
        if (res.length === 1 && Object.keys(firstRow).length === 1) {
          return String(Object.values(firstRow)[0]);
        }

        return res.map((row) => Object.values(row as Record<string, unknown>).join("\t")).join("\n");
      } catch (error) {
        console.error(`Error querying Zed workspace DB (executeSQL): ${error}`);
        throw error;
      }
    }

    // Apply `--init /dev/null` to ignore user sqlite configuration on Unix-like systems
    const result = await execFilePromise("sqlite3", ["--init", "/dev/null", dbPath, query]);

    if (result.stderr) {
      console.error(`Error querying Zed workspace DB: ${result.stderr}`);
      throw new Error(`Error querying Zed workspace DB: ${result.stderr}`);
    }

    return result.stdout.trim();
  } catch (error) {
    console.error(`Error querying Zed workspace DB: ${error}`);
    throw error;
  }
}

/**
 * Get the Zed workspace database schema version.
 * Returns the version number and whether it's supported by this extension.
 */
export async function getZedWorkspaceDbVersion(dbPath: string): Promise<{ version: number; supported: boolean }> {
  try {
    const result = await queryDb(dbPath, "SELECT MAX(step) FROM migrations WHERE domain = 'WorkspaceDb';");
    const version = parseInt(result.trim(), 10);

    if (isNaN(version)) {
      console.error(`Error parsing Zed workspace DB version: ${result}`);
      return { version: 0, supported: false };
    }

    return {
      version,
      supported: version >= MIN_SUPPORTED_DB_VERSION,
    };
  } catch (error) {
    // Zed DB might be temporarily locked during write operation
    if (String(error).includes("Error: in prepare, database is locked")) {
      console.warn("DB is locked, assuming supported version");
      return { version: MIN_SUPPORTED_DB_VERSION, supported: true };
    }

    console.error(`Error getting Zed workspace DB version: ${error}`);
    return { version: 0, supported: false };
  }
}

/**
 * Get the appropriate SQL query for fetching workspaces based on schema version.
 * This allows for future schema changes while maintaining backward compatibility.
 */
export function getZedWorkspacesQuery(dbVersion: number): string {
  // For now, we only support v34+
  // Future schema changes can add new queries here
  if (dbVersion >= MIN_SUPPORTED_DB_VERSION) {
    return ZED_WORKSPACES_QUERY;
  }

  // Unsupported version - return the latest query anyway
  // The caller should check version support before calling this
  console.warn(`Unsupported DB version ${dbVersion}, using latest query`);
  return ZED_WORKSPACES_QUERY;
}

/**
 * SQL query to fetch workspaces from Zed DB (v34+).
 *
 * Schema uses remote_connections table for SSH/WSL/container connections.
 * Paths are stored as newline-separated strings with paths_order for ordering.
 *
 * See docs/zed-db.md for full schema documentation.
 */
export const ZED_WORKSPACES_QUERY = `SELECT
  CASE
    WHEN remote_connection_id IS NULL THEN 'local'
    ELSE 'remote'
  END as type,
  workspace_id as id,
  paths,
  paths_order,
  timestamp,
  window_id,
  session_id,
  host,
  user,
  port,
  kind,
  distro,
  name
FROM workspaces
LEFT JOIN remote_connections ON remote_connection_id = remote_connections.id
WHERE paths IS NOT NULL AND paths != ''
ORDER BY timestamp DESC`;
