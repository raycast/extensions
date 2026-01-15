//
// Zed Workspace types, returned from query
//
export type ZedWorkspaceType = "local" | "remote";

export interface ZedBaseWorkspace {
  id: number;
  timestamp: number;
  type: ZedWorkspaceType;
  paths: string;
  window_id: number | null;
  session_id: string | null;
}

export interface ZedLocalWorkspace extends ZedBaseWorkspace {
  type: "local";
}

export interface ZedRemoteWorkspace extends ZedBaseWorkspace {
  type: "remote";
  host: string;
  user: string | null;
  port: number | null;
}

export interface ZedWorkspaceWithWsl extends ZedRemoteWorkspace {
  type: "remote";
  kind: string;
  distro: string | null;
  user: string | null;
}

export type ZedWorkspace = ZedLocalWorkspace | ZedRemoteWorkspace | ZedWorkspaceWithWsl;

//
// Unified types for extension
//

export interface Workspace {
  id: number;
  lastOpened: number;
  type: ZedWorkspaceType;
  path: string;
  uri: string;
  host?: string;
  isOpen?: boolean;
  wsl?: { user: string | null; distro: string | null } | null;
}

export function parseZedWorkspace(zedWorkspace: ZedWorkspace): Workspace | null {
  if (!zedWorkspace.paths) {
    return null;
  }

  const paths = zedWorkspace.paths
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p);

  if (paths.length === 0) {
    return null;
  }

  // Use first path as primary path
  const path = paths[0];

  if (zedWorkspace.type === "local") {
    const processedPath = path.replace(/\/+$/, "");
    return {
      id: zedWorkspace.id,
      lastOpened: zedWorkspace.timestamp,
      type: zedWorkspace.type,
      uri: "file://" + processedPath,
      path: processedPath,
    };
  }

  if (zedWorkspace.type === "remote") {
    const processedPath = path.replace(/^\/+/, "").replace(/\/+$/, "");
    const uri = `ssh://${zedWorkspace.user ? zedWorkspace.user + "@" : ""}${zedWorkspace.host}${
      zedWorkspace.port ? ":" + zedWorkspace.port : ""
    }/${processedPath}`;

    const hasWsl = "kind" in zedWorkspace && zedWorkspace.kind === "wsl" && zedWorkspace.user && zedWorkspace.distro;
    const wsl = hasWsl ? { user: zedWorkspace.user, distro: zedWorkspace.distro } : null;
    return {
      id: zedWorkspace.id,
      lastOpened: zedWorkspace.timestamp,
      type: zedWorkspace.type,
      uri,
      path: processedPath,
      host: zedWorkspace.host,
      ...(hasWsl && { wsl }),
    };
  }

  return null;
}
