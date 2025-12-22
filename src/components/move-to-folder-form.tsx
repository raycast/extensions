import { Action, ActionPanel, List, Icon, showToast, Toast, useNavigation } from "@raycast/api"
import React, { useMemo, memo, useCallback } from "react"
import { updateFolder } from "../storage"
import { Folder, FolderItem } from "../types"
import { getFolderIcon, getItemDisplayName, generateId, pluralize } from "../utils"
import { useFoldersData, useApplicationsData } from "../hooks"
import { getNestedFolderIds } from "../form-utils"

interface MoveToFolderFormProps {
  /** The item to move */
  item: FolderItem
  /** The current folder containing the item */
  currentFolder: Folder
  /** Callback after successful move */
  onMove: () => void | Promise<void>
}

/**
 * Form to select a destination folder for moving an item
 */
function MoveToFolderForm({ item, currentFolder, onMove }: MoveToFolderFormProps) {
  const { pop } = useNavigation()
  const { folders: allFolders, isLoading } = useFoldersData()
  const { applications } = useApplicationsData()

  const itemName = useMemo(() => getItemDisplayName(item, applications, allFolders), [item, applications, allFolders])

  // Get nested folder IDs for categorization
  const nestedFolderIds = useMemo(() => getNestedFolderIds(allFolders), [allFolders])

  // Filter and categorize folders
  const { parentFolders, nestedFolders } = useMemo(() => {
    const available = allFolders.filter((f) => {
      // Can't move to current folder
      if (f.id === currentFolder.id) return false
      // If moving a nested folder, can't move it into itself
      if (item.type === "folder" && item.folderId === f.id) return false
      return true
    })

    return {
      parentFolders: available.filter((f) => !nestedFolderIds.has(f.id)),
      nestedFolders: available.filter((f) => nestedFolderIds.has(f.id)),
    }
  }, [allFolders, currentFolder.id, item, nestedFolderIds])

  const totalAvailable = parentFolders.length + nestedFolders.length

  const handleMove = useCallback(
    async (targetFolder: Folder) => {
      try {
        // Remove item from current folder
        const updatedCurrentItems = currentFolder.items.filter((i) => i.id !== item.id)
        await updateFolder(currentFolder.id, { items: updatedCurrentItems })

        // Add item to target folder (with new ID to avoid conflicts)
        const newItem: FolderItem = { ...item, id: generateId() }
        await updateFolder(targetFolder.id, {
          items: [...targetFolder.items, newItem],
        })

        await showToast({
          style: Toast.Style.Success,
          title: "Item moved",
          message: `"${itemName}" moved to "${targetFolder.name}"`,
        })

        await onMove()
        pop()
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to move item",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    },
    [currentFolder, item, itemName, onMove]
  )

  const renderFolderItem = useCallback(
    (folder: Folder) => (
      <List.Item
        key={folder.id}
        title={folder.name}
        subtitle={`${folder.items.length} ${pluralize(folder.items.length, "item")}`}
        icon={getFolderIcon(folder.icon, folder.color)}
        actions={
          <ActionPanel>
            <Action title={`Move to "${folder.name}"`} icon={Icon.ArrowRight} onAction={() => handleMove(folder)} />
          </ActionPanel>
        }
      />
    ),
    [handleMove]
  )

  return (
    <List isLoading={isLoading} navigationTitle={`Move "${itemName}" to...`} searchBarPlaceholder="Search folders...">
      {totalAvailable === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No folders available"
          description="Create another folder first to move items"
        />
      ) : (
        <>
          {parentFolders.length > 0 && (
            <List.Section title="Folders" subtitle={`${parentFolders.length}`}>
              {parentFolders.map(renderFolderItem)}
            </List.Section>
          )}
          {nestedFolders.length > 0 && (
            <List.Section title="Nested Folders" subtitle={`${nestedFolders.length}`}>
              {nestedFolders.map(renderFolderItem)}
            </List.Section>
          )}
        </>
      )}
    </List>
  )
}

export default memo(MoveToFolderForm)
