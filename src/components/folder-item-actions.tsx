import { Action, ActionPanel, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import React, { useMemo, useCallback, memo } from "react";
import { Folder } from "../types";
import FolderContentsView from "../folder-contents";
import FolderEditForm from "../folder-edit-form";
import ImportFoldersForm from "./import-folders-form";
import { pluralize, getFolderIconPlain, openAllApplications, openAllWebsites } from "../utils";
import { useFoldersData, useApplicationsData, useCopyUrls } from "../hooks";
import { updateFolder } from "../storage";
import { exportFolder, exportAllFolders } from "../backup";
import { filterApplications, filterWebsites } from "../form-utils";

interface FolderItemActionsProps {
  folder: Folder;
  /** Optional callback to sync parent component after changes */
  onFolderChange?: () => void;
}

export const FolderItemActions = memo(function FolderItemActions({ folder, onFolderChange }: FolderItemActionsProps) {
  const { applications } = useApplicationsData();
  const { folders: allFolders, handleSave: defaultHandleSave, handleDelete } = useFoldersData();

  // Use provided callback or default handleSave
  const handleSave = onFolderChange || defaultHandleSave;

  // URL copying functionality (reusable hook)
  const { hasUrls, copyAsMarkdown, copyAsList } = useCopyUrls(folder, allFolders);

  const deeplink = useMemo(
    () =>
      createDeeplink({
        command: "index",
        context: { folderId: folder.id, folderName: folder.name },
      }),
    [folder.id, folder.name],
  );

  // Get the folder's custom icon for the quicklink (plain Icon, without color tinting)
  const folderIcon = useMemo(() => getFolderIconPlain(folder.icon), [folder.icon]);

  // Filter items by type once for efficiency
  const { appItems, websiteItems, hasApps, hasWebsites } = useMemo(() => {
    const apps = filterApplications(folder.items);
    const websites = filterWebsites(folder.items);
    return {
      appItems: apps,
      websiteItems: websites,
      hasApps: apps.length > 0,
      hasWebsites: websites.length > 0,
    };
  }, [folder.items]);

  const handleOpenAllApps = useCallback(
    () => openAllApplications(appItems, folder.name, applications),
    [appItems, folder.name, applications],
  );

  const handleOpenAllWebsites = useCallback(
    () => openAllWebsites(websiteItems, folder.name),
    [websiteItems, folder.name],
  );

  const handleEmptyFolder = useCallback(async () => {
    if (folder.items.length === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "Folder is already empty",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Empty Folder",
      message: `Remove all ${folder.items.length} ${pluralize(folder.items.length, "item")} from "${folder.name}"? The folder itself will be kept.`,
      primaryAction: {
        title: "Empty Folder",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    await updateFolder(folder.id, { items: [] });
    await handleSave();

    await showToast({
      style: Toast.Style.Success,
      title: "Folder emptied",
      message: `Removed ${folder.items.length} ${pluralize(folder.items.length, "item")}`,
    });
  }, [folder.id, folder.name, folder.items.length, handleSave]);

  return (
    <ActionPanel>
      {/* Primary Action */}
      <ActionPanel.Section>
        <Action.Push
          title="Open Folder"
          icon={Icon.ArrowRight}
          target={<FolderContentsView folderId={folder.id} folderName={folder.name} />}
        />
      </ActionPanel.Section>

      {/* Open All */}
      {(hasApps || hasWebsites) && (
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
              onAction={handleOpenAllWebsites}
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
        <Action.Push
          title="Edit Folder"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={<FolderEditForm folder={folder} onSave={handleSave} navigateToFolderAfterSave={false} />}
        />
        <Action.Push
          title="Create New Folder"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<FolderEditForm onSave={handleSave} navigateToFolderAfterSave={false} />}
        />
      </ActionPanel.Section>

      {/* Quicklinks */}
      <ActionPanel.Section title="Quicklinks">
        <Action.CreateQuicklink
          title="Create Quicklink"
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          quicklink={{
            name: `Open ${folder.name}`,
            link: deeplink,
            icon: folderIcon,
          }}
        />
        <Action.CopyToClipboard
          title="Copy Quicklink URL"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          content={deeplink}
        />
      </ActionPanel.Section>

      {/* Backup */}
      <ActionPanel.Section title="Backup">
        <Action
          title="Export This Folder"
          icon={Icon.Upload}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={() => exportFolder(folder)}
        />
        <Action title="Export All Folders" icon={Icon.Upload} onAction={exportAllFolders} />
        <Action.Push title="Import Folders" icon={Icon.Download} target={<ImportFoldersForm />} />
      </ActionPanel.Section>

      {/* Danger Zone */}
      <ActionPanel.Section title="Danger Zone">
        {folder.items.length > 0 && (
          <Action
            title="Empty Folder"
            icon={Icon.Eraser}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
            onAction={handleEmptyFolder}
          />
        )}
        <Action
          title="Delete Folder"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={() => handleDelete(folder.id, folder.name)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
});
