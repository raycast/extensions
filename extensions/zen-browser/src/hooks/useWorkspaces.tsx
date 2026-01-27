import { useSQL } from "@raycast/utils";
import { existsSync } from "fs";
import { ReactElement } from "react";
import { NotInstalledError } from "../components";
import { WorkspaceModel } from "../interfaces";
import { getPlacesDbPath } from "../util";
import { useRetrySQLError } from "./useRetrySQLError";
import { useShortcuts } from "./useShortcuts";

export const useWorkspaces = () => {
  const { shortcuts, errorView: shortcutsErrorView } = useShortcuts();
  const { data: workspaces, isLoading, permissionView } = useListWorkspaces();

  const errorView = shortcutsErrorView || permissionView;
  if (!workspaces) {
    return { data: workspaces, isLoading, errorView: errorView as ReactElement };
  }

  const workspaceEntries = workspaces
    .map((ws) => {
      const sc = shortcuts.find((s) => s.id === `zen-workspace-switch-${ws.position / 1000}`);

      return {
        ...ws,
        shortcut: sc,
      };
    })
    .sort((a, b) => a.position - b.position);

  return { data: workspaceEntries, isLoading, errorView: errorView as ReactElement };
};

export const useListWorkspaces = () => {
  const dbPath = getPlacesDbPath();
  const inQuery = getAllWorkspacesQuery();

  if (!existsSync(dbPath)) {
    return { data: [], isLoading: false, permissionView: <NotInstalledError /> };
  }

  const { data, isLoading, error, permissionView, revalidate } = useSQL<WorkspaceModel>(dbPath, inQuery);
  useRetrySQLError({ error, onRetry: revalidate });

  return { data, isLoading, permissionView: permissionView as ReactElement };
};

const getAllWorkspacesQuery = () => {
  return `
  SELECT * FROM zen_workspaces;
  `;
};
