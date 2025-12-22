import { useNavigation } from "@raycast/api";
import React, { useState, useEffect, useCallback } from "react";
import { updateFolder, getFolderById } from "../storage";
import { Folder, FolderItem } from "../types";
import { generateId } from "../utils";
import { CREATE_NEW_FOLDER_VALUE } from "../constants";
import FolderEditForm from "../folder-edit-form";

interface UseNestedFolderCreationOptions {
  /** Current folder being edited (if editing existing) */
  folder?: Folder;
  /** All available folders for nesting */
  availableFolders: Folder[];
  /** Current form values for folders field */
  folderValues: string[] | undefined;
  /** Form setValue function */
  setValue: (name: "folders", value: string[]) => void;
  /** Callback when data should be refreshed */
  onSave: () => void | Promise<void>;
  /** Revalidate folders data */
  revalidate: () => void;
}

interface UseNestedFolderCreationResult {
  /** Callback to handle newly created folder */
  handleFolderCreated: (newFolderId: string) => Promise<void>;
  /** Navigate to create folder form - call when CREATE_NEW_FOLDER_VALUE is selected */
  navigateToCreateFolder: () => void;
}

/**
 * Hook to manage nested folder creation workflow.
 * Handles the common pattern of:
 * 1. Detecting when "Create New Folder" is selected in a TagPicker
 * 2. Navigating to the create form
 * 3. Adding the newly created folder to the current form selection
 * 4. Optionally saving the nesting relationship immediately
 */
export function useNestedFolderCreation({
  folder,
  availableFolders,
  folderValues,
  setValue,
  onSave,
  revalidate,
}: UseNestedFolderCreationOptions): UseNestedFolderCreationResult {
  const { push } = useNavigation();

  // Track pending new folder ID to add after data refreshes
  const [pendingNewFolderId, setPendingNewFolderId] = useState<string | null>(null);

  // Handle new folder creation - immediately save the nesting relationship
  const handleFolderCreated = useCallback(
    async (newFolderId: string): Promise<void> => {
      // If editing an existing folder, immediately add the new folder as nested
      // This ensures the nesting is saved even if user presses Escape
      if (folder) {
        const newFolder = await getFolderById(newFolderId);
        const newNestedItem: FolderItem = {
          id: generateId(),
          name: newFolder?.name || "New Folder",
          type: "folder",
          folderId: newFolderId,
        };
        await updateFolder(folder.id, {
          items: [...folder.items, newNestedItem],
        });
        await onSave();
      }

      // Set the pending folder ID - it will be added to form selection once data refreshes
      setPendingNewFolderId(newFolderId);

      // Force a revalidation to get fresh data
      revalidate();

      // Give the revalidation a moment to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
    [folder, revalidate, onSave],
  );

  // Navigate to create folder form
  const navigateToCreateFolder = useCallback(() => {
    push(<FolderEditForm onSave={onSave} onCreated={handleFolderCreated} hideCreateOption />);
  }, [push, onSave, handleFolderCreated]);

  // When folders list updates and we have a pending folder, add it to selection
  useEffect(() => {
    if (pendingNewFolderId && availableFolders.some((f) => f.id === pendingNewFolderId)) {
      const currentFolders = (folderValues || []).filter((id) => id !== CREATE_NEW_FOLDER_VALUE);
      if (!currentFolders.includes(pendingNewFolderId)) {
        setValue("folders", [...currentFolders, pendingNewFolderId]);
      }
      setPendingNewFolderId(null);
    }
  }, [availableFolders, pendingNewFolderId, folderValues, setValue]);

  // Detect when "Create New Folder" is selected and navigate to create form
  useEffect(() => {
    if (folderValues?.includes(CREATE_NEW_FOLDER_VALUE)) {
      // Remove the special value from selection
      const filteredFolders = folderValues.filter((id) => id !== CREATE_NEW_FOLDER_VALUE);
      setValue("folders", filteredFolders);

      // Navigate to create form
      navigateToCreateFolder();
    }
  }, [folderValues, setValue, navigateToCreateFolder]);

  return { handleFolderCreated, navigateToCreateFolder };
}
