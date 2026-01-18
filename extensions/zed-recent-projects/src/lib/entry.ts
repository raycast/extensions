import { dirname, basename } from "path";
import tildify from "tildify";
import { Workspace, ZedWorkspaceType } from "./workspaces";

export interface Entry {
  id: number;
  path: string;
  uri: string;
  title: string;
  subtitle: string;
  type: ZedWorkspaceType;
  isOpen?: boolean;
  wsl?: { user: string | null; distro: string | null } | null;
}

export function getEntry(workspace: Workspace): Entry | null {
  try {
    const suffix = workspace.wsl
      ? ` [WSL: ${workspace.wsl.distro}]`
      : workspace.type === "remote"
        ? " [SSH: " + workspace.host + "]"
        : "";

    const title = decodeURIComponent(basename(workspace.path)) || workspace.path;
    const subtitle = tildify(dirname(workspace.path)) + suffix;

    return {
      id: workspace.id,
      type: workspace.type,
      path: workspace.path,
      uri: workspace.uri,
      title,
      subtitle,
      isOpen: workspace.isOpen,
      wsl: workspace.wsl,
    };
  } catch {
    return null;
  }
}
