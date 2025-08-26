import { Alert, confirmAlert, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast, useSQL } from "@raycast/utils";
import { execFile } from "child_process";
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

function getPath() {
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
  paths: string;
  paths_order: string | null;
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

function processLocalWorkspace(workspace: LocalWorkspace): ZedEntry | undefined {
  // For dev build, paths are JSON, not binary
  if (!workspace.local_paths) {
    return undefined;
  }

  let paths: string[] | null = null;

  // Try parsing as JSON first (dev build format)
  try {
    const parsed = JSON.parse(workspace.local_paths);
    if (Array.isArray(parsed)) {
      paths = parsed;
    }
  } catch {
    // If JSON parsing fails, try binary format (stable build)
    paths = parseLocalPaths(workspace.local_paths);
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
    console.error("Error processing remote workspace:", error);
    return undefined;
  }
}

export function useZedRecentWorkspaces(): ZedRecentWorkspaces {
  const path = getPath();

  if (!fs.existsSync(path)) {
    return {
      entries: {},
      removeEntry: () => Promise.resolve(),
      removeAllEntries: () => Promise.resolve(),
    };
  }

  const query = `
    SELECT
      CASE
        WHEN ssh_connection_id IS NULL THEN 'local'
        ELSE 'remote'
      END as type,
      workspace_id as id,
      paths as local_paths,
      paths,
      paths_order,
      timestamp,
      host,
      user,
      port
    FROM workspaces
    LEFT JOIN ssh_connections ON ssh_connection_id = ssh_connections.id
    WHERE paths IS NOT NULL AND paths != ''
    ORDER BY timestamp DESC
  `;

  const { data, isLoading, error, mutate } = useSQL<Workspace>(path, query);

  async function removeEntry(id: number) {
    try {
      await mutate(deleteEntryById(id), { shouldRevalidateAfter: true });

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
        await mutate(deleteAllWorkspaces(), { shouldRevalidateAfter: true });
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
            entry = processLocalWorkspace(workspace);
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

async function deleteEntryById(id: number) {
  const deleteQuery = `
DELETE FROM ssh_connections WHERE id = (
  SELECT ssh_connection_id FROM workspaces WHERE workspace_id = ${id}
);
DELETE FROM workspaces WHERE workspace_id = ${id}
`;
  await execFilePromise("sqlite3", [getPath(), deleteQuery]);
}

async function deleteAllWorkspaces() {
  await execFilePromise("sqlite3", [getPath(), "DELETE FROM ssh_connections;DELETE FROM workspaces;"]);
}
