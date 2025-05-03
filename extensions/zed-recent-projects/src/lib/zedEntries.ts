import { Alert, confirmAlert, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast, useSQL } from "@raycast/utils";
import { execFile } from "child_process";
import fs from "fs";
import { homedir } from "os";
import util from "util";

import { getZedDbName } from "./zed";

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
  remote_paths: string;
  host: string;
  user: string;
  port: string;
}

type Workspace = LocalWorkspace | RemoteWorkspace;

interface ZedRecentWorkspaces {
  entries: ZedEntries;
  isLoading?: boolean;
  error?: Error;
  removeEntry: (id: number) => Promise<void>;
  removeAllEntries: () => Promise<void>;
}

function processLocalWorkspace(workspace: LocalWorkspace): ZedEntry {
  const pathStart = workspace.local_paths.indexOf("/");
  const path = workspace.local_paths.substring(pathStart);
  return {
    id: workspace.id,
    path,
    uri: "file://" + path.replace(/\/$/, ""),
    lastOpened: new Date(workspace.timestamp).getTime(),
  };
}

function processRemoteWorkspace(workspace: RemoteWorkspace): ZedEntry | undefined {
  try {
    const paths = JSON.parse(workspace.remote_paths);
    if (!Array.isArray(paths) || paths.length === 0) {
      throw new Error("Invalid remote paths format");
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
    showFailureToast(error, { title: "Error processing workspace" });
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
        WHEN local_paths IS NOT NULL THEN 'local'
        ELSE 'remote'
      END as type,
      workspace_id as id,
      local_paths,
      paths AS remote_paths,
      timestamp,
      host,
      user,
      port
    FROM workspaces
    LEFT JOIN ssh_projects ON ssh_project_id = workspaces.ssh_project_id
    WHERE (local_paths IS NOT NULL AND paths IS NULL)
       OR (local_paths IS NULL AND paths IS NOT NULL)
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
DELETE FROM ssh_projects WHERE id = (
  SELECT ssh_project_id FROM workspaces WHERE workspace_id = ${id}
);
DELETE FROM workspaces WHERE workspace_id = ${id}
`;
  await execFilePromise("sqlite3", [getPath(), deleteQuery]);
}

async function deleteAllWorkspaces() {
  await execFilePromise("sqlite3", [getPath(), "DELETE FROM ssh_projects;DELETE FROM workspaces;"]);
}
