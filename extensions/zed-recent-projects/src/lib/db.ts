import { execFilePromise } from "./utils";

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

// Current migration step for Zed Stable as of 2025-09-09
export const DEFAULT_WORKSPACE_DB_VERSION = 28;

export async function queryDb(dbPath: string, query: string) {
  try {
    const result = await execFilePromise("sqlite3", [dbPath, query]);

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

export async function getZedWorkspaceDbVersion(
  dbPath: string,
  defaultDbVersion: number = DEFAULT_WORKSPACE_DB_VERSION,
): Promise<{ version: number; supported: boolean }> {
  try {
    const result = await queryDb(dbPath, "SELECT MAX(step) FROM migrations WHERE domain = 'WorkspaceDb';");
    const version = parseInt(result.trim(), 10);

    if (isNaN(version)) {
      console.error(`Error parsing Zed workspace DB version: ${result}`);
      return {
        version: 0,
        supported: false,
      };
    }

    return { version, supported: true };
  } catch (error) {
    // Zed DB might be temporarily locked during write operation
    if (String(error).includes("Error: in prepare, database is locked")) {
      console.warn("DB is locked, fallback to default version");
      return { version: defaultDbVersion, supported: true };
    }

    console.error(`Error getting Zed workspace DB version: ${error}`);
    return { version: 0, supported: false };
  }
}

export function getZedWorkspacesQuery(dbVersion: number): string {
  if (dbVersion <= 24) {
    return ZED_WORKSPACES_QUERY_24;
  } else if (dbVersion <= 26) {
    return ZED_WORKSPACES_QUERY_26;
  } else {
    return ZED_WORKSPACES_QUERY_28;
  }
}

// Schema version 24 and below uses ssh_projects table and separate local_paths field
export const ZED_WORKSPACES_QUERY_24 = `SELECT
  CASE
    WHEN local_paths IS NOT NULL THEN 'local'
    ELSE 'remote'
  END as type,
  workspace_id as id,
  local_paths,
  paths,
  timestamp,
  host,
  user,
  port
FROM workspaces
LEFT JOIN ssh_projects ON ssh_project_id = ssh_projects.id
WHERE (local_paths IS NOT NULL AND paths IS NULL)
   OR (local_paths IS NULL AND paths IS NOT NULL)
ORDER BY timestamp DESC`;

// Schema version 26-27 uses ssh_connections table and unified paths field
export const ZED_WORKSPACES_QUERY_26 = `SELECT
  CASE
    WHEN ssh_connection_id IS NULL THEN 'local'
    ELSE 'remote'
  END as type,
  workspace_id as id,
  paths,
  timestamp,
  host,
  user,
  port
FROM workspaces
LEFT JOIN ssh_connections ON ssh_connection_id = ssh_connections.id
WHERE paths IS NOT NULL AND paths != ''
ORDER BY timestamp DESC`;

// Schema version 28+ uses remote_connections table instead of ssh_connections
export const ZED_WORKSPACES_QUERY_28 = `SELECT
  CASE
    WHEN remote_connection_id IS NULL THEN 'local'
    ELSE 'remote'
  END as type,
  workspace_id as id,
  paths,
  timestamp,
  host,
  user,
  port
FROM workspaces
LEFT JOIN remote_connections ON remote_connection_id = remote_connections.id
WHERE paths IS NOT NULL AND paths != ''
ORDER BY timestamp DESC`;
