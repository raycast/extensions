import fs from "fs";
import { homedir } from "os";
import { useSQL } from "@raycast/utils";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getZedDbName } from "./zed";

const preferences = getPreferenceValues<Preferences>();
const zedBuild = preferences.build;

export interface ZedEntry {
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
}

async function showFailureToast(error: Error, title = "Error processing workspace") {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: error.message,
  });
}

function processLocalWorkspace(workspace: LocalWorkspace): ZedEntry {
  const pathStart = workspace.local_paths.indexOf("/");
  const path = workspace.local_paths.substring(pathStart);
  return {
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
      path,
      uri,
      lastOpened: new Date(workspace.timestamp).getTime(),
      host: workspace.host,
    };
  } catch (error) {
    showFailureToast(error instanceof Error ? error : new Error(String(error)));
    return undefined;
  }
}

export function useZedRecentWorkspaces(): ZedRecentWorkspaces {
  const path = getPath();

  if (!fs.existsSync(path)) {
    return {
      entries: {},
    };
  }

  const query = `
    SELECT 
      CASE 
        WHEN local_paths IS NOT NULL THEN 'local'
        ELSE 'remote'
      END as type,
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

  const { data, isLoading, error } = useSQL<Workspace>(path, query);

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
  };
}
