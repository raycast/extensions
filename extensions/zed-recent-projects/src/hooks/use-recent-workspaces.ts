import { Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast, useSQL } from "@raycast/utils";
import { DEFAULT_WORKSPACE_DB_VERSION, getZedWorkspacesQuery, queryDb } from "../lib/db";
import { ZedWorkspace, Workspace, parseZedWorkspace } from "../lib/workspaces";
import { getOpenWindowIds } from "../lib/utils";

export type Workspaces = Record<string, Workspace>;

interface RecentWorkspaces {
  workspaces: Workspaces;
  isLoading?: boolean;
  error?: Error;
  removeEntry: (id: number) => Promise<void>;
  removeAllEntries: () => Promise<void>;
  revalidate: () => void;
}

export function useRecentWorkspaces(
  dbPath: string,
  dbVersion: number = DEFAULT_WORKSPACE_DB_VERSION,
): RecentWorkspaces {
  const { sessionId, windowIds } = getOpenWindowIds(dbPath);
  const { data, isLoading, error, mutate, revalidate } = useSQL<ZedWorkspace>(dbPath, getZedWorkspacesQuery(dbVersion));

  async function removeEntry(id: number) {
    try {
      await mutate(deleteEntryById(dbPath, id), { shouldRevalidateAfter: true });
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
        await mutate(deleteAllWorkspaces(dbPath), { shouldRevalidateAfter: true });
        showToast(Toast.Style.Success, "All entries removed");
      }
    } catch (error) {
      showFailureToast(error, {
        title: "Failed to remove entries",
      });
    }
  }

  return {
    workspaces: data
      ? data.reduce<Workspaces>((acc, zedWorkspace) => {
          const workspace = parseZedWorkspace(zedWorkspace);
          if (!workspace) {
            return acc;
          }

          const existing = acc[workspace.uri];
          if (existing && existing.lastOpened > workspace.lastOpened) {
            return acc;
          }

          const isOpen =
            zedWorkspace.session_id === sessionId &&
            zedWorkspace.window_id !== null &&
            windowIds.has(zedWorkspace.window_id);

          return { ...acc, [workspace.uri]: { ...workspace, isOpen } };
        }, {})
      : {},
    isLoading,
    error,
    removeAllEntries,
    removeEntry,
    revalidate,
  };
}

async function deleteEntryById(dbPath: string, id: number) {
  await queryDb(dbPath, `DELETE FROM workspaces WHERE workspace_id = ${id};`);
}

async function deleteAllWorkspaces(dbPath: string) {
  await queryDb(dbPath, "DELETE FROM workspaces;");
}
