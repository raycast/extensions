import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api"
import { useForm } from "@raycast/utils"
import React, { useMemo, memo } from "react"
import { updateFolder } from "../storage"
import { Folder } from "../types"
import { createApplicationItem, createNestedFolderItem, pluralize, getFolderIcon } from "../utils"
import { useApplicationsData, useFoldersData, useNestedFolderCreation } from "../hooks"
import {
  getNestedFolderIds,
  validateWebsiteUrls,
  processWebsiteUrls,
  findDuplicateUrls,
  confirmDuplicateUrls,
  confirmDuplicates,
  DuplicateInfo,
} from "../form-utils"
import { CREATE_NEW_FOLDER_VALUE } from "../constants"
import FolderEditForm from "../folder-edit-form"

interface AddItemsFormProps {
  folder: Folder
  onSave: () => void | Promise<void>
}

interface FormValues {
  applications: string[]
  folders: string[]
  websiteUrls: string
}

function AddItemsForm({ folder, onSave }: AddItemsFormProps) {
  const { pop } = useNavigation()
  const { applications, isLoading: isLoadingApps } = useApplicationsData()
  const { folders: allFolders, isLoading: isLoadingFolders, revalidate } = useFoldersData()

  // Get existing item paths/ids for duplicate detection
  const existingAppPaths = useMemo(
    () => new Set(folder.items.filter((i) => i.type === "application").map((i) => i.path)),
    [folder.items]
  )

  const existingFolderIds = useMemo(
    () => new Set(folder.items.filter((i) => i.type === "folder").map((i) => i.folderId)),
    [folder.items]
  )

  // Find folders that already have a parent (for single parent constraint)
  const foldersWithParent = useMemo(() => getNestedFolderIds(allFolders), [allFolders])

  // Available folders: exclude current folder and folders that already have a parent elsewhere
  const availableFolders = useMemo(
    () => allFolders.filter((f) => f.id !== folder.id && !foldersWithParent.has(f.id)),
    [allFolders, folder.id, foldersWithParent]
  )

  const { handleSubmit, itemProps, setValue, values } = useForm<FormValues>({
    initialValues: {
      applications: [],
      folders: [],
      websiteUrls: "",
    },
    validation: {
      websiteUrls: validateWebsiteUrls,
    },
    async onSubmit(values) {
      const newItems = []
      const duplicateItems: DuplicateInfo[] = []

      // Check for duplicate applications
      const apps = values.applications || []
      const duplicateApps = apps.filter((path) => existingAppPaths.has(path))
      const newApps = apps.filter((path) => !existingAppPaths.has(path))

      duplicateApps.forEach((path) => {
        const app = applications.find((a) => a.path === path)
        if (app) duplicateItems.push({ name: app.name, type: "application" })
      })

      // Check for duplicate folders (exclude the CREATE_NEW_FOLDER_VALUE)
      const folders = (values.folders || []).filter((id) => id !== CREATE_NEW_FOLDER_VALUE)
      const duplicateFolders = folders.filter((id) => existingFolderIds.has(id))
      const newFolders = folders.filter((id) => !existingFolderIds.has(id))

      duplicateFolders.forEach((id) => {
        const f = allFolders.find((f) => f.id === id)
        if (f) duplicateItems.push({ name: f.name, type: "folder" })
      })

      // If there are duplicate apps/folders, ask user what to do
      const includeDuplicateAppsAndFolders =
        duplicateItems.length > 0 ? await confirmDuplicates(duplicateItems) : false

      // Add applications (include duplicates if user confirmed)
      const appsToAdd = includeDuplicateAppsAndFolders ? apps : newApps
      if (appsToAdd.length > 0) {
        newItems.push(...appsToAdd.map((path) => createApplicationItem(path, applications)))
      }

      // Add folders (include duplicates if user confirmed)
      const foldersToAdd = includeDuplicateAppsAndFolders ? folders : newFolders
      if (foldersToAdd.length > 0) {
        newItems.push(...foldersToAdd.map((id) => createNestedFolderItem(id, availableFolders)))
      }

      // Check for duplicate websites before adding
      const urlInput = values.websiteUrls || ""
      if (urlInput.trim()) {
        const duplicates = findDuplicateUrls(urlInput, folder.items)
        let includeDuplicateWebsites = true

        if (duplicates.length > 0) {
          includeDuplicateWebsites = await confirmDuplicateUrls(duplicates)
        }

        const websiteItems = await processWebsiteUrls(
          urlInput,
          folder.items,
          includeDuplicateWebsites
        )
        newItems.push(...websiteItems)
      }

      if (newItems.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "No items to add" })
        return
      }

      await updateFolder(folder.id, {
        items: [...folder.items, ...newItems],
      })

      await showToast({
        style: Toast.Style.Success,
        title: `Added ${newItems.length} ${pluralize(newItems.length, "item")}`,
        message: `to ${folder.name}`,
      })

      await onSave()
      pop()
    },
  })

  // Use shared hook for nested folder creation workflow
  const { handleFolderCreated } = useNestedFolderCreation({
    folder,
    availableFolders,
    folderValues: values?.folders,
    setValue,
    onSave,
    revalidate,
  })

  const isLoading = isLoadingApps || isLoadingFolders

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Add to ${folder.name}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm icon={Icon.Plus} title="Add Items" onSubmit={handleSubmit} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Nested Folders">
            <Action.Push
              icon={Icon.NewFolder}
              title="Create New Folder to Nest"
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              target={
                <FolderEditForm onSave={onSave} onCreated={handleFolderCreated} hideCreateOption />
              }
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TagPicker
        title="Applications"
        placeholder="Select applications to add..."
        {...itemProps.applications}
      >
        {applications.map((app) => (
          <Form.TagPicker.Item
            key={app.path}
            value={app.path}
            title={app.name}
            icon={app.path ? { fileIcon: app.path } : Icon.AppWindow}
          />
        ))}
      </Form.TagPicker>

      <Form.TextArea
        title="Website URLs"
        placeholder={"https://github.com\nhttps://google.com\nhttps://raycast.com"}
        info="Enter one URL per line. Favicons and titles will be automatically fetched."
        {...itemProps.websiteUrls}
      />

      <Form.TagPicker
        title="Nested Folders"
        placeholder="Select folders to nest..."
        {...itemProps.folders}
      >
        <Form.TagPicker.Item
          key={CREATE_NEW_FOLDER_VALUE}
          value={CREATE_NEW_FOLDER_VALUE}
          title="​Create New Folder..."
          icon={Icon.PlusCircle}
        />
        {availableFolders.map((f) => (
          <Form.TagPicker.Item
            key={f.id}
            value={f.id}
            title={f.name}
            icon={getFolderIcon(f.icon, f.color)}
          />
        ))}
      </Form.TagPicker>
    </Form>
  )
}

export default memo(AddItemsForm)
