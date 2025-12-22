import { Action, ActionPanel, Icon, List, getPreferenceValues, LaunchProps } from "@raycast/api"
import React, { useCallback } from "react"
import FolderContentsView from "./folder-contents"
import FolderEditForm from "./folder-edit-form"
import ImportFoldersForm from "./components/import-folders-form"
import { generateFolderKeywords, getFolderIcon, pluralize } from "./utils"
import { FolderItemActions } from "./components/folder-item-actions"
import { useFolderPreviewDetail } from "./components/folder-preview-detail"
import { useFoldersData, useApplicationsData } from "./hooks"
import { NO_FOLDERS_VIEW } from "./constants"

interface LaunchContext {
  folderId?: string
  folderName?: string
}

interface Preferences {
  showPreviewPane: boolean
}

export default function Command(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  // Handle deeplink context - render folder contents directly if opened via quicklink
  const context = props.launchContext as LaunchContext | undefined
  if (context?.folderId) {
    return <FolderContentsView folderId={context.folderId} folderName={context.folderName || "Folder"} />
  }

  const { showPreviewPane = false } = getPreferenceValues<Preferences>()
  const {
    folders,
    topLevelFolders,
    nestedFolders,
    isLoading: isLoadingFolders,
    handleSave,
  } = useFoldersData({ enablePolling: true })
  const { applications, isLoading: isLoadingApps } = useApplicationsData()

  const isLoading = isLoadingFolders || isLoadingApps

  const renderDetail = useFolderPreviewDetail(showPreviewPane, applications, folders)

  const isEmpty = folders.length === 0 && !isLoading

  // Create folder action - reused in empty view and folder items
  const CreateFolderAction = useCallback(
    () => (
      <Action.Push
        title="Create New Folder"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<FolderEditForm onSave={handleSave} navigateToFolderAfterSave={false} />}
      />
    ),
    [handleSave]
  )

  const renderFolderItem = useCallback(
    (folder: (typeof folders)[0]) => (
      <List.Item
        key={folder.id}
        id={folder.id}
        title={folder.name}
        subtitle={showPreviewPane ? undefined : `${folder.items.length} ${pluralize(folder.items.length, "item")}`}
        icon={getFolderIcon(folder.icon, folder.color)}
        keywords={generateFolderKeywords(folder.name)}
        actions={<FolderItemActions folder={folder} onFolderChange={handleSave} />}
        detail={renderDetail(folder)}
      />
    ),
    [showPreviewPane, renderDetail, handleSave]
  )

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search folders..." filtering isShowingDetail={showPreviewPane}>
      {isEmpty ? (
        <List.EmptyView
          {...NO_FOLDERS_VIEW}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <CreateFolderAction />
              </ActionPanel.Section>
              <ActionPanel.Section title="Backup">
                <Action.Push title="Import Folders" icon={Icon.Download} target={<ImportFoldersForm />} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : (
        <>
          {topLevelFolders.length > 0 && (
            <List.Section title="Folders" subtitle={`${topLevelFolders.length}`}>
              {topLevelFolders.map(renderFolderItem)}
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
