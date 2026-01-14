import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  popToRoot,
  useNavigation,
  getPreferenceValues,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import React, { useMemo, useEffect, useRef } from "react";
import { addFolder, updateFolder } from "./storage";
import FolderContentsView from "./folder-contents";
import { Folder, FolderItem } from "./types";
import {
  generateId,
  getFolderIconOptions,
  getFolderIcon,
  createApplicationItem,
  createNestedFolderItem,
  isValidHexColor,
  normalizeHexColor,
} from "./utils";
import { useApplicationsData, useFoldersData, useNestedFolderCreation } from "./hooks";
import {
  getFolderParentMap,
  validateWebsiteUrls,
  processWebsiteUrls,
  extractWebsiteUrls,
  extractAppPaths,
  parseWebsiteUrls,
  extractFolderIds,
  confirmDuplicates,
} from "./form-utils";
import { CREATE_NEW_FOLDER_VALUE } from "./constants";

interface FolderEditFormProps {
  folder?: Folder;
  onSave: () => void | Promise<void>;
  /** When provided, called with new folder ID after creation (used for nested folder creation) */
  onCreated?: (folderId: string) => Promise<void>;
  /** Hide the "Create New Folder" option in nested folders (prevents recursion) */
  hideCreateOption?: boolean;
  /** Navigate to folder contents after save (default: true) */
  navigateToFolderAfterSave?: boolean;
}

interface FormValues {
  name: string;
  applications: string[];
  folders: string[];
  icon: string;
  color: string;
  websiteUrls: string;
}

// Memoize icon options - they don't change at runtime
const ICON_OPTIONS = getFolderIconOptions();

export default function FolderEditForm({
  folder: folderProp,
  onSave,
  onCreated,
  hideCreateOption,
  navigateToFolderAfterSave = true,
}: FolderEditFormProps) {
  const { push, pop } = useNavigation();
  const { applications, isLoading: isLoadingApps } = useApplicationsData();
  const { folders: allFolders, isLoading: isLoadingFolders, revalidate } = useFoldersData();
  const { defaultFolderColor = "" } = getPreferenceValues<Preferences>();

  // Use fresh folder data from the cache instead of the potentially stale prop
  // This ensures we always get the latest data after items are added/removed
  const folder = useMemo(() => {
    if (!folderProp) return undefined;
    return allFolders.find((f) => f.id === folderProp.id) || folderProp;
  }, [folderProp, allFolders]);

  // Find all ancestor folders (folders that contain the current folder, directly or indirectly)
  // This prevents circular nesting (e.g., if A contains B, B cannot contain A)
  const ancestorIds = useMemo(() => {
    if (!folder) return new Set<string>();

    const ancestors = new Set<string>();

    // Helper to check if a folder contains the target folder (directly or indirectly)
    const containsFolder = (checkFolder: Folder, targetId: string, visited: Set<string>): boolean => {
      if (visited.has(checkFolder.id)) return false; // Prevent infinite loops
      visited.add(checkFolder.id);

      for (const item of checkFolder.items) {
        if (item.type === "folder" && item.folderId) {
          if (item.folderId === targetId) return true;
          const nestedFolder = allFolders.find((f) => f.id === item.folderId);
          if (nestedFolder && containsFolder(nestedFolder, targetId, visited)) return true;
        }
      }
      return false;
    };

    // Check each folder to see if it's an ancestor of the current folder
    for (const f of allFolders) {
      if (f.id !== folder.id && containsFolder(f, folder.id, new Set())) {
        ancestors.add(f.id);
      }
    }

    return ancestors;
  }, [folder, allFolders]);

  // Find folders that are already nested in another folder (have a parent)
  const foldersWithParent = useMemo(() => getFolderParentMap(allFolders), [allFolders]);

  // Get the IDs of folders currently nested in this folder (allowed to stay)
  const currentlyNestedIds = useMemo(() => {
    if (!folder) return new Set<string>();
    return new Set(
      folder.items.filter((item) => item.type === "folder" && item.folderId).map((item) => item.folderId!),
    );
  }, [folder]);

  // Filter out:
  // 1. Current folder (can't nest inside itself)
  // 2. Ancestor folders (prevents circular nesting)
  // 3. Folders already nested in another folder (unless already in current folder)
  const availableFolders = useMemo(
    () =>
      allFolders.filter((f) => {
        // Can't nest folder inside itself
        if (folder && f.id === folder.id) return false;
        // Can't nest ancestor (prevents circular references)
        if (ancestorIds.has(f.id)) return false;
        // If folder already has a parent, only allow if it's currently in this folder
        const parentId = foldersWithParent.get(f.id);
        if (parentId && parentId !== folder?.id && !currentlyNestedIds.has(f.id)) return false;
        return true;
      }),
    [allFolders, folder, ancestorIds, foldersWithParent, currentlyNestedIds],
  );

  // Use folder's color if editing, otherwise use default preference for new folders
  const initialColor = folder
    ? folder.color || ""
    : isValidHexColor(defaultFolderColor)
      ? normalizeHexColor(defaultFolderColor)
      : "";

  // Compute initial form values from existing folder data
  const initialFormValues = useMemo((): FormValues => {
    const baseValues: FormValues = {
      name: folder?.name || "",
      applications: [],
      folders: [],
      icon: folder?.icon || "Folder",
      color: initialColor,
      websiteUrls: "",
    };

    if (!folder) return baseValues;

    // Pre-populate with existing folder items
    return {
      ...baseValues,
      applications: extractAppPaths(folder.items, applications),
      folders: extractFolderIds(folder.items),
      websiteUrls: extractWebsiteUrls(folder.items),
    };
  }, [folder, applications, initialColor]);

  const { handleSubmit, itemProps, setValue, values } = useForm<FormValues>({
    initialValues: initialFormValues,
    validation: {
      name: FormValidation.Required,
      color: (value) => {
        if (value && !isValidHexColor(value)) {
          return "Invalid color (e.g., red, FF5733, or #FF5733)";
        }
      },
      websiteUrls: validateWebsiteUrls,
    },
    async onSubmit(formValues) {
      const folderItems: FolderItem[] = [];
      const existingItems = folder?.items || [];

      // Always save ALL form fields from ALL tabs
      // Add what's been added, remove what's been removed, keep what's the same

      // Handle APPLICATIONS - add all selected apps
      const appPaths = formValues.applications || [];
      if (appPaths.length > 0) {
        folderItems.push(...appPaths.map((path) => createApplicationItem(path, applications)));
      }

      // Handle WEBSITES - check for duplicates within the input
      const urlInput = formValues.websiteUrls || "";
      if (urlInput.trim()) {
        const urls = parseWebsiteUrls(urlInput);

        // Find URLs that appear more than once in the input
        const urlCounts = new Map<string, number>();
        for (const url of urls) {
          urlCounts.set(url, (urlCounts.get(url) || 0) + 1);
        }
        const duplicateUrls = [...urlCounts.entries()].filter(([, count]) => count > 1).map(([url]) => url);

        // Ask about duplicates if any exist
        const includeDuplicates =
          duplicateUrls.length > 0
            ? await confirmDuplicates(
                duplicateUrls.map((url) => ({ name: url })),
                {
                  title: "Duplicate URLs Found",
                  itemType: "URL",
                  addAction: "Keep Duplicates",
                  skipAction: "Remove Duplicates",
                },
              )
            : true;

        // If not including duplicates, deduplicate the URLs
        const urlsToProcess = includeDuplicates ? urlInput : [...new Set(urls)].join("\n");
        const websiteItems = await processWebsiteUrls(urlsToProcess, existingItems);
        folderItems.push(...websiteItems);
      }

      // Handle FOLDERS - add all selected folders
      const folderIds = (formValues.folders || []).filter((id) => id !== CREATE_NEW_FOLDER_VALUE);
      if (folderIds.length > 0) {
        folderItems.push(...folderIds.map((id) => createNestedFolderItem(id, availableFolders)));
      }

      const iconValue = formValues.icon === "Folder" ? undefined : formValues.icon;
      const colorValue =
        formValues.color && isValidHexColor(formValues.color) ? normalizeHexColor(formValues.color) : undefined;

      let newFolderId: string | undefined;

      if (folder) {
        await updateFolder(folder.id, {
          name: formValues.name,
          items: folderItems,
          icon: iconValue,
          color: colorValue,
        });
        await showToast({ style: Toast.Style.Success, title: "Folder updated" });
      } else {
        newFolderId = generateId();
        await addFolder({
          id: newFolderId,
          name: formValues.name,
          items: folderItems,
          icon: iconValue,
          color: colorValue,
        });
        await showToast({ style: Toast.Style.Success, title: "Folder created" });
      }

      await onSave();

      // If onCreated callback is provided (nested creation), use pop() and call it
      if (onCreated && newFolderId) {
        await onCreated(newFolderId);
        pop();
      } else if (navigateToFolderAfterSave) {
        // Navigate to the folder contents after save
        const savedFolderId = folder?.id || newFolderId;
        const savedFolderName = formValues.name;
        if (savedFolderId) {
          // Pop first, then push after a short delay to let navigation settle
          pop();
          setTimeout(() => {
            push(<FolderContentsView folderId={savedFolderId} folderName={savedFolderName} />);
          }, 50);
        } else {
          popToRoot();
        }
      } else {
        // Just pop back to the previous view
        pop();
      }
    },
  });

  // Track previous folder items to detect changes
  const prevFolderItemsRef = useRef<string | null>(null);

  // Sync form values when folder data changes (e.g., after item deletion)
  useEffect(() => {
    if (!folder) return;

    // Create a string representation of current items for comparison
    const currentItemsKey = JSON.stringify(
      folder.items.map((i) => ({ id: i.id, type: i.type, url: i.url, path: i.path })),
    );

    // Only update if the items have actually changed (not on first render)
    if (prevFolderItemsRef.current !== null && prevFolderItemsRef.current !== currentItemsKey) {
      // Update form values with fresh data
      setValue("applications", extractAppPaths(folder.items, applications));
      setValue("folders", extractFolderIds(folder.items));
      setValue("websiteUrls", extractWebsiteUrls(folder.items));
    }

    prevFolderItemsRef.current = currentItemsKey;
  }, [folder, applications, setValue]);

  // Use shared hook for nested folder creation workflow
  const { handleFolderCreated } = useNestedFolderCreation({
    folder,
    availableFolders,
    folderValues: values?.folders,
    setValue,
    onSave,
    revalidate,
  });

  const isLoading = isLoadingApps || isLoadingFolders;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              icon={Icon.Check}
              title={folder ? "Update Folder" : "Create Folder"}
              onSubmit={handleSubmit}
            />
          </ActionPanel.Section>
          {!hideCreateOption && (
            <ActionPanel.Section title="Nested Folders">
              <Action.Push
                icon={Icon.NewFolder}
                title="Create New Folder to Nest"
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                target={<FolderEditForm onSave={onSave} onCreated={handleFolderCreated} hideCreateOption />}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      <Form.TextField title="Folder Name" placeholder="e.g., Browsers" {...itemProps.name} />
      <Form.Dropdown title="Icon" {...itemProps.icon}>
        {ICON_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            value={opt.value}
            title={opt.title}
            icon={
              values?.color && isValidHexColor(values.color)
                ? { source: opt.icon, tintColor: normalizeHexColor(values.color) }
                : opt.icon
            }
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Icon Color"
        placeholder="red, coral, FF5733 (optional)"
        info="CSS color name or hex code (# optional)"
        {...itemProps.color}
      />

      <Form.Separator />

      <Form.TagPicker title="Applications" placeholder="Select applications..." {...itemProps.applications}>
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
        placeholder={"https://github.com\n[Custom Title](https://google.com)\nhttps://raycast.com"}
        info="One URL per line. Use [Title](URL) for custom names. Favicons are fetched automatically."
        {...itemProps.websiteUrls}
      />

      <Form.TagPicker title="Nested Folders" placeholder="Select folders..." {...itemProps.folders}>
        {/* Create New Folder option at the top (hidden when in nested creation to prevent recursion) */}
        {!hideCreateOption && (
          <Form.TagPicker.Item
            key={CREATE_NEW_FOLDER_VALUE}
            value={CREATE_NEW_FOLDER_VALUE}
            title="​Create New Folder..."
            icon={Icon.PlusCircle}
          />
        )}
        {availableFolders.map((f) => (
          <Form.TagPicker.Item key={f.id} value={f.id} title={f.name} icon={getFolderIcon(f.icon, f.color)} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
