import { useCachedPromise, MutatePromise } from "@raycast/utils"
import { getFolders, invalidateFoldersCache, deleteFolder } from "../storage"
import { Folder } from "../types"
import { useCallback, useMemo, useEffect } from "react"
import { showToast, Toast, confirmAlert, Alert } from "@raycast/api"
import { sortFolders } from "../utils"
import { getNestedFolderIds } from "../form-utils"
import { DEFAULT_SORT, NO_SORT, FOLDER_POLL_INTERVAL } from "../constants"

/**
 * Shared hook for fetching folders with caching and error handling
 * Uses Raycast's built-in failureToastOptions for automatic error handling
 */
export function useFolders() {
  return useCachedPromise(getFolders, [], {
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to load folders",
    },
  })
}

interface UseFoldersDataOptions {
  /** Enable polling for updates (useful for parent views that need to sync with child changes) */
  enablePolling?: boolean
}

/**
 * Get folders data with common operations and computed properties
 */
export function useFoldersData(options: UseFoldersDataOptions = {}): {
  folders: Folder[]
  sortedFolders: Folder[]
  nestedFolderIds: Set<string>
  topLevelFolders: Folder[]
  nestedFolders: Folder[]
  isLoading: boolean
  revalidate: () => void
  mutate: MutatePromise<Folder[] | undefined>
  handleSave: () => void
  handleDelete: (folderId: string, folderName: string) => Promise<void>
} {
  const { enablePolling = false } = options
  const { data = [], isLoading, revalidate, mutate } = useFolders()

  // Poll for updates if enabled
  useEffect(() => {
    if (!enablePolling) return
    const interval = setInterval(revalidate, FOLDER_POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [enablePolling, revalidate])

  // Find all folder IDs that are nested within other folders (reuse form-utils function)
  const nestedFolderIds = useMemo(() => getNestedFolderIds(data), [data])

  // Sort folders and separate by nesting status
  const { sortedFolders, topLevelFolders, nestedFolders } = useMemo(() => {
    const sorted = sortFolders(data, DEFAULT_SORT, NO_SORT, NO_SORT)
    return {
      sortedFolders: sorted,
      topLevelFolders: sorted.filter((f) => !nestedFolderIds.has(f.id)),
      nestedFolders: sorted.filter((f) => nestedFolderIds.has(f.id)),
    }
  }, [data, nestedFolderIds])

  const handleSave = useCallback(async () => {
    invalidateFoldersCache()
    await revalidate()
  }, [revalidate])

  const handleDelete = useCallback(
    async (folderId: string, folderName: string) => {
      const confirmed = await confirmAlert({
        title: "Delete Folder",
        message: `Are you sure you want to delete "${folderName}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })

      if (!confirmed) return

      // Optimistic update
      await mutate(
        deleteFolder(folderId).then(() => {
          invalidateFoldersCache()
          return getFolders()
        }),
        {
          optimisticUpdate: (currentData) => currentData?.filter((f) => f.id !== folderId) ?? [],
        }
      )

      await showToast({
        style: Toast.Style.Success,
        title: "Folder deleted",
      })
    },
    [mutate]
  )

  return {
    folders: data,
    sortedFolders,
    nestedFolderIds,
    topLevelFolders,
    nestedFolders,
    isLoading,
    revalidate,
    mutate,
    handleSave,
    handleDelete,
  }
}
