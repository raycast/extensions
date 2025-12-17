import {
  Action,
  ActionPanel,
  Icon,
  List,
  Grid,
  open,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api"
import { useCachedPromise } from "@raycast/utils"
import React, { useMemo, useCallback, memo } from "react"
import {
  getFolderById,
  recordFolderAccess,
  recordItemAccess,
  invalidateFoldersCache,
  updateFolder,
} from "./storage"
import { FolderItem, Folder } from "./types"
import {
  getItemDisplayName,
  sortFolderItems,
  getItemIcon,
  pluralize,
  generateId,
  findDuplicateItems,
  openAllApplications,
  openAllWebsites,
  toastSuccess,
  toastFailure,
  toastLoading,
} from "./utils"
import {
  useApplicationsData,
  useFoldersData,
  useFolderContentsPreferences,
  useRunningApps,
  useCopyUrls,
} from "./hooks"
import { filterApplications, filterWebsites } from "./form-utils"
import { fetchAndCacheFavicon } from "./favicon"
import AddItemsForm from "./components/add-items-form"
import WebsiteEditForm from "./components/website-edit-form"
import MoveToFolderForm from "./components/move-to-folder-form"
import FolderEditForm from "./folder-edit-form"
import { FolderPreviewDetail } from "./components/folder-preview-detail"
import { EMPTY_FOLDER_VIEW, FOLDER_NOT_FOUND_VIEW } from "./constants"

interface FolderContentsViewProps {
  folderId: string
  folderName: string
  parentPath?: string // Breadcrumb path for nested folders
}

// Wrapper to avoid circular imports
function FolderContentsViewWrapper({ folderId, folderName, parentPath }: FolderContentsViewProps) {
  return <FolderContentsView folderId={folderId} folderName={folderName} parentPath={parentPath} />
}

// Nested folder action with access tracking - memoized for performance
const OpenNestedFolderAction = memo(function OpenNestedFolderAction({
  folderId,
  itemId,
  itemFolderId,
  itemName,
  currentPath,
  onAccessRecorded,
}: {
  folderId: string
  itemId: string
  itemFolderId: string
  itemName: string
  currentPath: string
  onAccessRecorded?: () => void
}) {
  const { push } = useNavigation()

  const handleOpen = useCallback(async () => {
    await recordItemAccess(folderId, itemId)
    onAccessRecorded?.()
    const newPath = `${currentPath} → ${itemName}`
    push(
      <FolderContentsViewWrapper
        folderId={itemFolderId}
        folderName={itemName}
        parentPath={newPath}
      />
    )
  }, [folderId, itemId, itemFolderId, itemName, currentPath, onAccessRecorded, push])

  return <Action title="Open Folder" icon={Icon.ArrowRight} onAction={handleOpen} />
})

// Add Items action component - memoized for performance
const AddItemsAction = memo(function AddItemsAction({
  folder,
  onSave,
}: {
  folder: Folder
  onSave: () => void
}) {
  return (
    <Action.Push
      title="Add Items"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<AddItemsForm folder={folder} onSave={onSave} />}
    />
  )
})

export default function FolderContentsView({
  folderId,
  folderName,
  parentPath,
}: FolderContentsViewProps) {
  // Build the display path for navigation title
  const displayPath = parentPath || folderName

  // Poll preferences for dynamic updates
  const prefs = useFolderContentsPreferences()

  const { applications, isLoading: isLoadingApps } = useApplicationsData()
  const { folders: allFolders } = useFoldersData()

  const {
    data: folder,
    isLoading: isLoadingFolder,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      const loaded = await getFolderById(id)
      if (loaded) await recordFolderAccess(id)
      return loaded
    },
    [folderId],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Failed to load folder" },
    }
  )

  const isLoading = isLoadingFolder || isLoadingApps

  const sortedItems = useMemo(() => {
    if (!folder) return []
    return sortFolderItems(
      folder.items,
      prefs.folderContentsSortPrimary || "alphabetical-asc",
      prefs.folderContentsSortSecondary || "none",
      prefs.folderContentsSortTertiary || "none",
      applications
    )
  }, [
    folder,
    applications,
    prefs.folderContentsSortPrimary,
    prefs.folderContentsSortSecondary,
    prefs.folderContentsSortTertiary,
  ])

  const viewType = prefs.folderContentsViewType || "list"
  const showPreviewPane = prefs.showPreviewPane ?? false

  // Render detail for items when preview pane is enabled
  const renderItemDetail = useCallback(
    (item: FolderItem) => {
      if (!showPreviewPane) return undefined

      // For nested folders, show their contents
      if (item.type === "folder" && item.folderId) {
        const nestedFolder = allFolders.find((f) => f.id === item.folderId)
        if (nestedFolder) {
          return (
            <FolderPreviewDetail
              folder={nestedFolder}
              applications={applications}
              allFolders={allFolders}
            />
          )
        }
      }

      // For applications, show basic info
      if (item.type === "application") {
        return (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Type" text="Application" />
                <List.Item.Detail.Metadata.Label
                  title="Name"
                  text={getItemDisplayName(item, applications, allFolders)}
                />
                {item.path && <List.Item.Detail.Metadata.Label title="Path" text={item.path} />}
              </List.Item.Detail.Metadata>
            }
          />
        )
      }

      // For websites, show URL and title
      if (item.type === "website") {
        return (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Type" text="Website" />
                <List.Item.Detail.Metadata.Label title="Title" text={item.name} />
                {item.url && (
                  <List.Item.Detail.Metadata.Link title="URL" text={item.url} target={item.url} />
                )}
              </List.Item.Detail.Metadata>
            }
          />
        )
      }

      return undefined
    },
    [showPreviewPane, allFolders, applications]
  )

  const handleSave = useCallback(async () => {
    invalidateFoldersCache()
    await revalidate()
  }, [revalidate])

  const handleRemoveItem = useCallback(
    async (item: FolderItem) => {
      if (!folder) return

      const itemName = getItemDisplayName(item, applications, allFolders)

      const confirmed = await confirmAlert({
        title: "Remove Item",
        message: `Remove "${itemName}" from ${folderName}?`,
        primaryAction: {
          title: "Remove",
          style: Alert.ActionStyle.Destructive,
        },
      })

      if (!confirmed) return

      const updatedItems = folder.items.filter((i) => i.id !== item.id)
      await updateFolder(folderId, { items: updatedItems })

      await toastSuccess("Removed", `${itemName} removed from ${folderName}`)

      await handleSave()
    },
    [folder, folderId, folderName, applications, allFolders, handleSave]
  )

  // Find duplicate items in the folder (same URL for websites, same path for apps)
  const duplicateInfo = useMemo(
    () =>
      folder
        ? findDuplicateItems(folder.items)
        : { hasDuplicates: false, duplicateCount: 0, uniqueItems: [] },
    [folder]
  )

  const handleRemoveDuplicates = useCallback(async () => {
    if (!folder || !duplicateInfo.hasDuplicates) {
      await toastSuccess("No duplicates found")
      return
    }

    const { duplicateCount, uniqueItems } = duplicateInfo

    const confirmed = await confirmAlert({
      title: "Remove Duplicates",
      message: `Remove ${duplicateCount} duplicate ${pluralize(duplicateCount, "item")} from "${folderName}"? The first occurrence of each item will be kept.`,
      primaryAction: {
        title: "Remove Duplicates",
        style: Alert.ActionStyle.Destructive,
      },
    })

    if (!confirmed) return

    await updateFolder(folderId, { items: uniqueItems })

    await toastSuccess(
      "Duplicates removed",
      `Removed ${duplicateCount} ${pluralize(duplicateCount, "item")}`
    )

    await handleSave()
  }, [folder, folderId, folderName, duplicateInfo, handleSave])

  const handleDuplicateItem = useCallback(
    async (item: FolderItem) => {
      if (!folder) return

      const itemName = getItemDisplayName(item, applications, allFolders)

      // Create a copy of the item with a new ID
      const newItem: FolderItem = {
        ...item,
        id: generateId(),
      }

      await updateFolder(folderId, {
        items: [...folder.items, newItem],
      })

      await toastSuccess("Item duplicated", `"${itemName}" duplicated`)

      await handleSave()
    },
    [folder, folderId, applications, allFolders, handleSave]
  )

  const handleRefreshFavicon = useCallback(
    async (item: FolderItem) => {
      if (!folder || item.type !== "website" || !item.url) return

      await toastLoading("Refreshing favicon...")

      // Force re-fetch, bypassing cache
      const newIconPath = await fetchAndCacheFavicon(item.url, true)

      // Update the item with the new icon path
      const updatedItems = folder.items.map((i) =>
        i.id === item.id ? { ...i, icon: newIconPath } : i
      )

      await updateFolder(folderId, { items: updatedItems })

      await toastSuccess(newIconPath ? "Favicon refreshed" : "No favicon found", item.name)

      await handleSave()
    },
    [folder, folderId, handleSave]
  )

  const handleOpenItem = useCallback(
    async (item: FolderItem) => {
      try {
        await recordItemAccess(folderId, item.id)
        revalidate()

        if (item.type === "application" && item.path) {
          await open(item.path)
          await toastSuccess("Opened", getItemDisplayName(item, applications, allFolders))
        } else if (item.type === "website" && item.url) {
          await open(item.url)
          await toastSuccess("Opened", getItemDisplayName(item, applications, allFolders))
        }
      } catch (error) {
        await toastFailure(
          "Failed to open",
          error instanceof Error ? error.message : "Unknown error"
        )
      }
    },
    [folderId, applications, revalidate]
  )

  // Get items by type once (memoized) - used for bulk actions and section rendering
  const { appItemsList, websiteItemsList } = useMemo(
    () => ({
      appItemsList: folder ? filterApplications(folder.items) : [],
      websiteItemsList: folder ? filterWebsites(folder.items) : [],
    }),
    [folder]
  )

  const hasApps = appItemsList.length > 0
  const hasWebsites = websiteItemsList.length > 0

  const handleOpenAllApps = useCallback(
    () => openAllApplications(appItemsList, folderName, applications),
    [appItemsList, folderName, applications]
  )

  const handleOpenAllWeb = useCallback(
    () => openAllWebsites(websiteItemsList, folderName),
    [websiteItemsList, folderName]
  )

  // URL copying functionality (reusable hook)
  const { hasUrls, copyAsMarkdown, copyAsList } = useCopyUrls(folder, allFolders)

  // Track running applications
  const { hasRunningApps, quitAllRunningApps } = useRunningApps(appItemsList, applications)

  const handleQuitAllApplications = useCallback(
    () => quitAllRunningApps(folderName),
    [quitAllRunningApps, folderName]
  )

  const renderActions = useCallback(
    (item: FolderItem) => (
      <ActionPanel>
        {/* Primary Action */}
        <ActionPanel.Section>
          {item.type === "application" ? (
            <Action
              title="Open Application"
              icon={Icon.ArrowRight}
              onAction={() => handleOpenItem(item)}
            />
          ) : item.type === "website" ? (
            <Action title="Open Website" icon={Icon.Globe} onAction={() => handleOpenItem(item)} />
          ) : item.folderId ? (
            <OpenNestedFolderAction
              folderId={folderId}
              itemId={item.id}
              itemFolderId={item.folderId}
              itemName={item.name}
              currentPath={displayPath}
              onAccessRecorded={revalidate}
            />
          ) : (
            <Action
              title="Open Folder"
              icon={Icon.ArrowRight}
              onAction={() => handleOpenItem(item)}
            />
          )}
        </ActionPanel.Section>

        {/* Open All */}
        {(hasApps || hasWebsites || hasRunningApps) && (
          <ActionPanel.Section title="Open All">
            {hasApps && (
              <Action
                title="Open All Applications"
                icon={Icon.AppWindow}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={handleOpenAllApps}
              />
            )}
            {hasWebsites && (
              <Action
                title="Open All Websites"
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                onAction={handleOpenAllWeb}
              />
            )}
            {hasRunningApps && (
              <Action
                title="Quit All Running Applications"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
                style={Action.Style.Destructive}
                onAction={handleQuitAllApplications}
              />
            )}
          </ActionPanel.Section>
        )}

        {/* Copy URLs */}
        {hasUrls && (
          <ActionPanel.Section title="Copy URLs">
            <Action
              title="Copy as Markdown"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              onAction={copyAsMarkdown}
            />
            <Action
              title="Copy as List"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={copyAsList}
            />
          </ActionPanel.Section>
        )}

        {/* Organize */}
        <ActionPanel.Section title="Organize">
          {folder && <AddItemsAction folder={folder} onSave={handleSave} />}
          {item.type === "website" && folder && (
            <>
              <Action.Push
                title="Edit Website"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<WebsiteEditForm folder={folder} item={item} onSave={handleSave} />}
              />
              <Action
                title="Refresh Favicon"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => handleRefreshFavicon(item)}
              />
            </>
          )}
          {item.type === "folder" &&
            item.folderId &&
            (() => {
              const nestedFolder = allFolders.find((f) => f.id === item.folderId)
              return nestedFolder ? (
                <Action.Push
                  title="Edit Folder"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={
                    <FolderEditForm
                      folder={nestedFolder}
                      onSave={handleSave}
                      navigateToFolderAfterSave={false}
                    />
                  }
                />
              ) : null
            })()}
          <Action
            title="Duplicate Item"
            icon={Icon.CopyClipboard}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => handleDuplicateItem(item)}
          />
          {folder && allFolders.length > 1 && (
            <Action.Push
              title="Move to Folder…"
              icon={Icon.ArrowRightCircle}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              target={<MoveToFolderForm item={item} currentFolder={folder} onMove={handleSave} />}
            />
          )}
        </ActionPanel.Section>

        {/* Danger Zone */}
        <ActionPanel.Section title="Danger Zone">
          <Action
            title="Remove from Folder"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={() => handleRemoveItem(item)}
          />
          {duplicateInfo.hasDuplicates && (
            <Action
              title={`Remove ${duplicateInfo.duplicateCount} Duplicate${duplicateInfo.duplicateCount > 1 ? "s" : ""}`}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleRemoveDuplicates}
            />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    ),
    [
      folderId,
      folder,
      allFolders,
      displayPath,
      handleOpenItem,
      handleSave,
      handleRemoveItem,
      handleDuplicateItem,
      handleRefreshFavicon,
      handleRemoveDuplicates,
      duplicateInfo,
      revalidate,
      hasApps,
      handleOpenAllApps,
      hasWebsites,
      handleOpenAllWeb,
      hasUrls,
      copyAsMarkdown,
      copyAsList,
      hasRunningApps,
      handleQuitAllApplications,
    ]
  )

  // Separate sorted items by type (memoized for performance)
  const { appItems, websiteItems, nestedFolderItems } = useMemo(
    () => ({
      appItems: sortedItems.filter((item) => item.type === "application"),
      websiteItems: sortedItems.filter((item) => item.type === "website"),
      nestedFolderItems: sortedItems.filter((item) => item.type === "folder"),
    }),
    [sortedItems]
  )

  const separateSections = prefs.gridSeparateSections ?? true

  if (!folder) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView {...FOLDER_NOT_FOUND_VIEW} />
      </List>
    )
  }

  const commonProps = {
    isLoading,
    navigationTitle: displayPath,
    searchBarPlaceholder: "Search items...",
  }

  if (viewType === "grid") {
    return (
      <Grid {...commonProps}>
        {sortedItems.length === 0 ? (
          <Grid.EmptyView
            {...EMPTY_FOLDER_VIEW}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <AddItemsAction folder={folder} onSave={handleSave} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ) : separateSections ? (
          <>
            {appItems.length > 0 && (
              <Grid.Section
                title="Applications"
                subtitle={`${appItems.length} ${pluralize(appItems.length, "app")}`}
              >
                {appItems.map((item) => (
                  <Grid.Item
                    key={item.id}
                    id={item.id}
                    title={getItemDisplayName(item, applications, allFolders)}
                    content={getItemIcon(item, applications, allFolders)}
                    actions={renderActions(item)}
                  />
                ))}
              </Grid.Section>
            )}
            {websiteItems.length > 0 && (
              <Grid.Section
                title="Websites"
                subtitle={`${websiteItems.length} ${pluralize(websiteItems.length, "website")}`}
                inset={Grid.Inset.Large}
              >
                {websiteItems.map((item) => (
                  <Grid.Item
                    key={item.id}
                    id={item.id}
                    title={getItemDisplayName(item, applications, allFolders)}
                    content={getItemIcon(item, applications, allFolders)}
                    actions={renderActions(item)}
                  />
                ))}
              </Grid.Section>
            )}
            {nestedFolderItems.length > 0 && (
              <Grid.Section
                title="Folders"
                subtitle={`${nestedFolderItems.length} ${pluralize(nestedFolderItems.length, "folder")}`}
                inset={Grid.Inset.Large}
              >
                {nestedFolderItems.map((item) => (
                  <Grid.Item
                    key={item.id}
                    id={item.id}
                    title={getItemDisplayName(item, applications, allFolders)}
                    content={getItemIcon(item, applications, allFolders)}
                    actions={renderActions(item)}
                  />
                ))}
              </Grid.Section>
            )}
          </>
        ) : (
          sortedItems.map((item) => (
            <Grid.Item
              key={item.id}
              id={item.id}
              title={getItemDisplayName(item, applications, allFolders)}
              subtitle={
                item.type === "folder"
                  ? "Folder"
                  : item.type === "website"
                    ? "Website"
                    : "Application"
              }
              content={getItemIcon(item, applications, allFolders)}
              actions={renderActions(item)}
            />
          ))
        )}
      </Grid>
    )
  }

  return (
    <List {...commonProps} isShowingDetail={showPreviewPane}>
      {sortedItems.length === 0 ? (
        <List.EmptyView
          {...EMPTY_FOLDER_VIEW}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <AddItemsAction folder={folder} onSave={handleSave} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : separateSections ? (
        <>
          {appItems.length > 0 && (
            <List.Section
              title="Applications"
              subtitle={`${appItems.length} ${pluralize(appItems.length, "app")}`}
            >
              {appItems.map((item) => (
                <List.Item
                  key={item.id}
                  id={item.id}
                  title={getItemDisplayName(item, applications, allFolders)}
                  icon={getItemIcon(item, applications, allFolders)}
                  actions={renderActions(item)}
                  detail={renderItemDetail(item)}
                />
              ))}
            </List.Section>
          )}
          {websiteItems.length > 0 && (
            <List.Section
              title="Websites"
              subtitle={`${websiteItems.length} ${pluralize(websiteItems.length, "website")}`}
            >
              {websiteItems.map((item) => (
                <List.Item
                  key={item.id}
                  id={item.id}
                  title={getItemDisplayName(item, applications, allFolders)}
                  icon={getItemIcon(item, applications, allFolders)}
                  actions={renderActions(item)}
                  detail={renderItemDetail(item)}
                />
              ))}
            </List.Section>
          )}
          {nestedFolderItems.length > 0 && (
            <List.Section
              title="Folders"
              subtitle={`${nestedFolderItems.length} ${pluralize(nestedFolderItems.length, "folder")}`}
            >
              {nestedFolderItems.map((item) => (
                <List.Item
                  key={item.id}
                  id={item.id}
                  title={getItemDisplayName(item, applications, allFolders)}
                  icon={getItemIcon(item, applications, allFolders)}
                  actions={renderActions(item)}
                  detail={renderItemDetail(item)}
                />
              ))}
            </List.Section>
          )}
        </>
      ) : (
        sortedItems.map((item) => (
          <List.Item
            key={item.id}
            id={item.id}
            title={getItemDisplayName(item, applications, allFolders)}
            icon={getItemIcon(item, applications, allFolders)}
            subtitle={
              showPreviewPane
                ? undefined
                : item.type === "folder"
                  ? "Folder"
                  : item.type === "website"
                    ? "Website"
                    : "Application"
            }
            actions={renderActions(item)}
            detail={renderItemDetail(item)}
          />
        ))
      )}
    </List>
  )
}
