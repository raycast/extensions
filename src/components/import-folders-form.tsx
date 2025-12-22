import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  popToRoot,
  confirmAlert,
  Alert,
  LocalStorage,
} from "@raycast/api"
import React, { useState } from "react"
import { Folder, STORAGE_KEY } from "../types"
import { getFolders, invalidateFoldersCache } from "../storage"
import { pluralize } from "../utils"
import { validateImportData } from "../backup"

type ImportMode = "replace" | "merge"

export default function ImportFoldersForm() {
  const [jsonInput, setJsonInput] = useState("")
  const [importMode, setImportMode] = useState<ImportMode>("merge")
  const [isLoading, setIsLoading] = useState(false)

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No data provided",
        message: "Paste your backup JSON",
      })
      return
    }

    setIsLoading(true)

    try {
      const data = JSON.parse(jsonInput)

      if (!validateImportData(data)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid backup format",
          message: "The JSON doesn't match the expected format",
        })
        setIsLoading(false)
        return
      }

      const existingFolders = await getFolders()
      let finalFolders: Folder[]
      let message: string

      if (importMode === "replace") {
        // Confirm before replacing
        const confirmed = await confirmAlert({
          title: "Replace All Folders?",
          message: `This will delete your ${existingFolders.length} existing folder(s) and replace them with ${data.folders.length} folder(s) from the backup.`,
          primaryAction: {
            title: "Replace All",
            style: Alert.ActionStyle.Destructive,
          },
        })

        if (!confirmed) {
          setIsLoading(false)
          return
        }

        finalFolders = data.folders
        message = `Replaced with ${data.folders.length} ${pluralize(data.folders.length, "folder")}`
      } else {
        // Merge mode - add folders that don't exist by ID
        const existingIds = new Set(existingFolders.map((f) => f.id))
        const newFolders = data.folders.filter((f: Folder) => !existingIds.has(f.id))

        if (newFolders.length === 0) {
          await showToast({
            style: Toast.Style.Success,
            title: "Nothing to import",
            message: "All folders already exist",
          })
          setIsLoading(false)
          return
        }

        finalFolders = [...existingFolders, ...newFolders]
        message = `Added ${newFolders.length} new ${pluralize(newFolders.length, "folder")}`
      }

      // Save to storage
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(finalFolders))
      invalidateFoldersCache()

      await showToast({
        style: Toast.Style.Success,
        title: "Import successful",
        message,
      })

      popToRoot()
    } catch (error) {
      if (error instanceof SyntaxError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid JSON",
          message: "The pasted content is not valid JSON",
        })
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Import failed",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Import Folders"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm icon={Icon.Download} title="Import Folders" onSubmit={handleImport} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="json"
        title="Backup JSON"
        placeholder="Paste your exported folders JSON here..."
        value={jsonInput}
        onChange={setJsonInput}
        info="Paste the JSON from a previous export. Works with single folder or multi-folder backups."
      />

      <Form.Dropdown id="mode" title="Import Mode" value={importMode} onChange={(v) => setImportMode(v as ImportMode)}>
        <Form.Dropdown.Item value="merge" title="Merge" icon={Icon.Plus} />
        <Form.Dropdown.Item value="replace" title="Replace All" icon={Icon.ArrowClockwise} />
      </Form.Dropdown>

      <Form.Description
        title="Import Modes"
        text={
          importMode === "merge"
            ? "Merge: Adds new folders from the backup. Existing folders (by ID) are kept unchanged."
            : "Replace All: Deletes all existing folders and replaces them with the backup. Use with caution!"
        }
      />
    </Form>
  )
}
