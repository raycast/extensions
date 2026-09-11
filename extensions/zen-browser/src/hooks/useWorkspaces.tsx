import { existsSync } from "fs";
import { ReactElement } from "react";
import { NotInstalledError, UnknownError } from "../components";
import { getZenSessionsPath, readZenWorkspacesFromSession } from "../util";
import { useShortcuts } from "./useShortcuts";

export const useWorkspaces = () => {
  const { shortcuts, errorView: shortcutsErrorView } = useShortcuts();
  const { data: workspaces, isLoading, errorView: listErrorView } = useListWorkspaces();

  const errorView = shortcutsErrorView || listErrorView;
  if (!workspaces) {
    return { data: workspaces, isLoading, errorView: errorView as ReactElement };
  }

  const workspaceEntries = workspaces
    .map((ws) => {
      const sc = shortcuts.find((s) => s.id === `zen-workspace-switch-${ws.position / 1000 + 1}`);

      return {
        ...ws,
        shortcut: sc,
      };
    })
    .sort((a, b) => a.position - b.position);

  return { data: workspaceEntries, isLoading, errorView: errorView as ReactElement };
};

export const useListWorkspaces = () => {
  const sessionPath = getZenSessionsPath();

  if (!existsSync(sessionPath)) {
    return { data: undefined, isLoading: false, errorView: <NotInstalledError /> };
  }

  try {
    const data = readZenWorkspacesFromSession();
    return { data, isLoading: false, errorView: undefined };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { data: undefined, isLoading: false, errorView: <UnknownError message={message} /> };
  }
};
