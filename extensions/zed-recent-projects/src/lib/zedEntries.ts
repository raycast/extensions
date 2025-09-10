import { Alert, confirmAlert, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast, useSQL } from "@raycast/utils";
import { execFile, execFileSync } from "child_process";
import fs from "fs";
import { homedir } from "os";
import util from "util";

import { getZedDbName } from "./zed";

const MAX_PATH_COUNT = 100;
const preferences = getPreferenceValues<Preferences>();
const zedBuild = preferences.build;

export interface ZedEntry {
  id: number;
  path: string;
  uri: string;
  lastOpened: number;
  host?: string;
}

export type ZedEntries = Record<string, ZedEntry>;

export function getPath() {
  return `${homedir()}/Library/Application Support/Zed/db/${getZedDbName(zedBuild)}/db.sqlite`;
}

interface BaseWorkspace {
  id: number;
  timestamp: number;
  type: "local" | "remote";
}

interface LocalWorkspace extends BaseWorkspace {
  type: "local";
  local_paths: string;
}

interface RemoteWorkspace extends BaseWorkspace {
  type: "remote";
  paths: string; // In new schema (26+) or old schema for remote
  host: string;
  user: string | null;
  port: number | null;
}

type Workspace = LocalWorkspace | RemoteWorkspace;

interface ZedRecentWorkspaces {
  entries: ZedEntries;
  isLoading?: boolean;
  error?: Error;
  removeEntry: (id: number) => Promise<void>;
  removeAllEntries: () => Promise<void>;
}

/**
 * Parse Zed local workspace path data
 *
 * Zed stores local paths in binary format containing:
 * - 8 bytes: vector length (number of paths)
 * - For each path:
 *   - 8 bytes: string length
 *   - N bytes: UTF-8 encoded path string
 *
 * @param str - Binary path data from Zed database (as string)
 * @returns Array of parsed paths, or null if parsing fails
 */
function parseLocalPaths(str: string): string[] | null {
  if (!str) return null;

  try {
    const buffer = Buffer.from(str, "utf8");
    let offset = 0;

    // Read number of paths (8 bytes, little-endian)
    const count = Number(buffer.readBigUInt64LE(offset));
    offset += 8;

    if (count < 0 || count > MAX_PATH_COUNT) return null; // Sanity check

    const paths: string[] = [];
    for (let i = 0; i < count; i++) {
      // Read string length (8 bytes, little-endian)
      const length = Number(buffer.readBigUInt64LE(offset));
      offset += 8;

      if (length < 0 || offset + length > buffer.length) return null;

      // Read string data
      paths.push(buffer.subarray(offset, offset + length).toString("utf8"));
      offset += length;
    }

    return paths;
  } catch (error) {
    showFailureToast(error, {
      title: "Failed to parse Zed workspace paths",
      message: "Some workspace entries may not be displayed",
    });
    return null;
  }
}

function processLocalWorkspace(workspace: LocalWorkspace, schemaVersion: number): ZedEntry | undefined {
  // For dev build, paths are JSON, not binary
  if (!workspace.local_paths) {
    return undefined;
  }

  let paths: string[] | null = null;

  // Schema 27+ uses plain string paths
  if (schemaVersion >= 27) {
    // Single path stored as plain string
    const path = workspace.local_paths.trim();
    if (path) {
      paths = [path];
    }
  } else if (schemaVersion === 26) {
    // Schema 26 (dev) uses JSON arrays
    try {
      const parsed = JSON.parse(workspace.local_paths);
      if (Array.isArray(parsed)) {
        paths = parsed;
      }
    } catch {
      // If JSON parsing fails, fall back to plain string
      const path = workspace.local_paths.trim();
      if (path) {
        paths = [path];
      }
    }
  } else {
    // Schema 25 and below might use binary format
    try {
      const parsed = JSON.parse(workspace.local_paths);
      if (Array.isArray(parsed)) {
        paths = parsed;
      }
    } catch {
      // If JSON parsing fails, try binary format (old stable build)
      paths = parseLocalPaths(workspace.local_paths);
    }
  }

  // TODO: Only support single path workspaces for now
  if (!paths || paths.length !== 1) {
    return undefined;
  }

  const path = paths[0];
  // Path validation
  if (!path || path.trim() === "" || path.includes("\0")) {
    return undefined;
  }

  const cleanPath = path.trim();
  return {
    id: workspace.id,
    path: cleanPath,
    uri: "file://" + cleanPath.replace(/\/$/, ""),
    lastOpened: new Date(workspace.timestamp).getTime(),
  };
}

function processRemoteWorkspace(workspace: RemoteWorkspace): ZedEntry | undefined {
  try {
    if (!workspace.paths) {
      return undefined;
    }
    const paths = JSON.parse(workspace.paths);
    if (!Array.isArray(paths) || paths.length === 0) {
      return undefined;
    }
    const path = paths[0].replace(/^\/+/, "");
    const uri = `ssh://${workspace.user ? workspace.user + "@" : ""}${workspace.host}${
      workspace.port ? ":" + workspace.port : ""
    }/${path.replace(/\/$/, "")}`;

    return {
      id: workspace.id,
      path,
      uri,
      lastOpened: new Date(workspace.timestamp).getTime(),
      host: workspace.host,
    };
  } catch (error) {
    showFailureToast(error, {
      title: "Error processing remote workspace",
      message: "Failed to parse remote workspace data",
    });
    return undefined;
  }
}

export function getSchemaVersionSync(dbPath: string): number {
  try {
    // Check if database file exists first
    if (!fs.existsSync(dbPath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Database not found",
        message: `Database not found at: ${dbPath}`,
      });
      return 0;
    }

    const result = execFileSync("sqlite3", [dbPath, "SELECT MAX(step) FROM migrations WHERE domain = 'WorkspaceDb';"], {
      encoding: "utf8",
    });
    const version = parseInt(result.trim(), 10);
    return isNaN(version) ? 0 : version;
  } catch (error) {
    showFailureToast(error, {
      title: "Failed to get schema version",
      message: "Unable to determine Zed database schema version",
    });
    return 0;
  }
}

export function getQueryForSchema(schemaVersion: number): string {
  // Schema version 28+ uses remote_connections table instead of ssh_connections
  if (schemaVersion >= 28) {
    return `
      SELECT
        CASE
          WHEN remote_connection_id IS NULL THEN 'local'
          ELSE 'remote'
        END as type,
        workspace_id as id,
        paths as local_paths,
        paths,
        timestamp,
        host,
        user,
        port
      FROM workspaces
      LEFT JOIN remote_connections ON remote_connection_id = remote_connections.id
      WHERE paths IS NOT NULL AND paths != ''
      ORDER BY timestamp DESC
    `;
  }

  // Schema version 26-27 uses ssh_connections table and unified paths field
  if (schemaVersion >= 26) {
    return `
      SELECT
        CASE
          WHEN ssh_connection_id IS NULL THEN 'local'
          ELSE 'remote'
        END as type,
        workspace_id as id,
        paths as local_paths,
        paths,
        timestamp,
        host,
        user,
        port
      FROM workspaces
      LEFT JOIN ssh_connections ON ssh_connection_id = ssh_connections.id
      WHERE paths IS NOT NULL AND paths != ''
      ORDER BY timestamp DESC
    `;
  }

  // Schema version 24 and below uses ssh_projects table and separate local_paths field
  return `
    SELECT
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
    ORDER BY timestamp DESC
  `;
}

export function useZedRecentWorkspaces(schemaVersion?: number, query?: string | null): ZedRecentWorkspaces {
  const path = getPath();

  // Always call the hook, but use a dummy query if not ready
  const { data, isLoading, error, mutate } = useSQL<Workspace>(path, query || "SELECT * FROM workspaces LIMIT 0");

  if (!fs.existsSync(path) || !query) {
    return {
      entries: {},
      removeEntry: () => Promise.resolve(),
      removeAllEntries: () => Promise.resolve(),
      isLoading: true,
    };
  }

  async function removeEntry(id: number) {
    try {
      await mutate(deleteEntryById(id, schemaVersion ?? 0), { shouldRevalidateAfter: true });

      showToast(Toast.Style.Success, "Entry removed");
    } catch (error) {
      showFailureToast(error, { title: "Failed to remove entry" });
    }
  }

  async function removeAllEntries() {
    try {
      if (
        await confirmAlert({
          icon: Icon.Trash,
          title: "Remove all recent entries?",
          message: "This cannot be undone.",
          dismissAction: {
            title: "Cancel",
            style: Alert.ActionStyle.Cancel,
          },
          primaryAction: {
            title: "Remove",
            style: Alert.ActionStyle.Destructive,
          },
        })
      ) {
        await mutate(deleteAllWorkspaces(schemaVersion ?? 0), { shouldRevalidateAfter: true });
        showToast(Toast.Style.Success, "All entries removed");
      }
    } catch (error) {
      showFailureToast(error, {
        title: "Failed to remove entries",
      });
    }
  }

  return {
    entries: data
      ? data.reduce<ZedEntries>((acc, workspace) => {
          let entry: ZedEntry | undefined;

          if (workspace.type === "local") {
            entry = processLocalWorkspace(workspace, schemaVersion ?? 0);
          } else if (workspace.type === "remote") {
            entry = processRemoteWorkspace(workspace);
          }

          if (!entry) return acc;

          const existing = acc[entry.uri];
          if (existing && existing.lastOpened > entry.lastOpened) return acc;

          return { ...acc, [entry.uri]: entry };
        }, {})
      : {},
    isLoading,
    error,
    removeAllEntries,
    removeEntry,
  };
}

export const execFilePromise = util.promisify(execFile);

async function deleteEntryById(id: number, schemaVersion: number) {
  let deleteQuery: string;

  if (schemaVersion >= 28) {
    deleteQuery = `
DELETE FROM remote_connections WHERE id = (
  SELECT remote_connection_id FROM workspaces WHERE workspace_id = ${id}
);
DELETE FROM workspaces WHERE workspace_id = ${id}
`;
  } else if (schemaVersion >= 26) {
    deleteQuery = `
DELETE FROM ssh_connections WHERE id = (
  SELECT ssh_connection_id FROM workspaces WHERE workspace_id = ${id}
);
DELETE FROM workspaces WHERE workspace_id = ${id}
`;
  } else {
    deleteQuery = `
DELETE FROM ssh_projects WHERE id = (
  SELECT ssh_project_id FROM workspaces WHERE workspace_id = ${id}
);
DELETE FROM workspaces WHERE workspace_id = ${id}
`;
  }

  await execFilePromise("sqlite3", [getPath(), deleteQuery]);
}

async function deleteAllWorkspaces(schemaVersion: number) {
  let deleteQuery: string;

  if (schemaVersion >= 28) {
    deleteQuery = "DELETE FROM remote_connections;DELETE FROM workspaces;";
  } else if (schemaVersion >= 26) {
    deleteQuery = "DELETE FROM ssh_connections;DELETE FROM workspaces;";
  } else {
    deleteQuery = "DELETE FROM ssh_projects;DELETE FROM workspaces;";
  }

  await execFilePromise("sqlite3", [getPath(), deleteQuery]);
}
