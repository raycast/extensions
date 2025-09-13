import { Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast, useSQL } from "@raycast/utils";
import { execFilePromise } from "../lib/utils";
import { DEFAULT_WORKSPACE_DB_VERSION, getZedWorkspacesQuery } from "../lib/db";
import { ZedWorkspace, Workspace, parseZedWorkspace } from "../lib/workspaces";

export type Workspaces = Record<string, Workspace>;

interface RecentWorkspaces {
  workspaces: Workspaces;
  isLoading?: boolean;
  error?: Error;
  removeEntry: (id: number) => Promise<void>;
  removeAllEntries: () => Promise<void>;
}

export function useRecentWorkspaces(
  dbPath: string,
  dbVersion: number = DEFAULT_WORKSPACE_DB_VERSION,
): RecentWorkspaces {
  const { data, isLoading, error, mutate } = useSQL<ZedWorkspace>(dbPath, getZedWorkspacesQuery(dbVersion));

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

          return { ...acc, [workspace.uri]: workspace };
        }, {})
      : {},
    isLoading,
    error,
    removeAllEntries,
    removeEntry,
  };
}

async function deleteEntryById(dbPath: string, id: number) {
  const deleteQuery = `DELETE FROM workspaces WHERE workspace_id = ${id}`;
  await execFilePromise("sqlite3", [dbPath, deleteQuery]);
}

async function deleteAllWorkspaces(dbPath: string) {
  const deleteQuery = "DELETE FROM workspaces;";
  await execFilePromise("sqlite3", [dbPath, deleteQuery]);
}
