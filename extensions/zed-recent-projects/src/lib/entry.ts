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
}

export function getEntry(workspace: Workspace): Entry | null {
  try {
    const title = decodeURIComponent(basename(workspace.path));
    const subtitle =
      tildify(dirname(workspace.path)) + (workspace.type === "remote" ? " [SSH: " + workspace.host + "]" : "");

    return {
      id: workspace.id,
      type: workspace.type,
      path: workspace.path,
      uri: workspace.uri,
      title,
      subtitle,
    };
  } catch {
    return null;
  }
}
