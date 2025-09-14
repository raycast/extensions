import { useSQL } from "@raycast/utils";
import { existsSync } from "fs";
import { ReactElement, useState } from "react";
import { NotInstalledError } from "../components";
import { WorkspaceModel } from "../interfaces";
import { getPlacesDbPath } from "../util";
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
  const [retryCount, setRetryCount] = useState(0);

  if (!existsSync(dbPath)) {
    return { data: [], isLoading: false, permissionView: <NotInstalledError /> };
  }

  const { isLoading, data, permissionView } = useSQL<WorkspaceModel>(dbPath, inQuery, {
    execute: retryCount < 3,
    onError: (error) => {
      const isRetryableError =
        error.message?.includes("database is locked") || error.message?.includes("disk image is malformed");

      if (isRetryableError && retryCount < 3) {
        console.log(`Retrying to access the database. Attempt #${retryCount + 1}`);
        setTimeout(() => {
          setRetryCount(retryCount + 1);
        }, 100 * (retryCount + 1));
      }
    },
  });

  return { data, isLoading, permissionView: permissionView as ReactElement };
};

const getAllWorkspacesQuery = () => {
  return `
  SELECT * FROM zen_workspaces;
  `;
};
