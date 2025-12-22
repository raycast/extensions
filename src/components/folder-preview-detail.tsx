import { List, Icon, Application } from "@raycast/api";
import React, { useMemo, memo } from "react";
import { Folder } from "../types";
import { getItemDisplayName, getItemIcon, pluralize, getFolderIcon } from "../utils";

interface FolderPreviewDetailProps {
  folder: Folder;
  applications: Application[];
  allFolders: Folder[];
}

/**
 * Shared component for rendering folder preview details
 * Used by both index.tsx and manage-folders.tsx
 * Memoized to prevent unnecessary re-renders
 */
export const FolderPreviewDetail = memo(function FolderPreviewDetail({
  folder,
  applications,
  allFolders,
}: FolderPreviewDetailProps) {
  const { applicationItems, websiteItems, folderItems, totalCount, parentFolders } = useMemo(() => {
    // Sort items: alphabetical first, then by length
    const sortedApps = folder.items
      .filter((item) => item.type === "application")
      .sort((a, b) => {
        const aName = getItemDisplayName(a, applications);
        const bName = getItemDisplayName(b, applications);
        const alphaCompare = aName.localeCompare(bName);
        return alphaCompare !== 0 ? alphaCompare : aName.length - bName.length;
      });

    const sortedWebsites = folder.items
      .filter((item) => item.type === "website")
      .sort((a, b) => {
        const alphaCompare = a.name.localeCompare(b.name);
        return alphaCompare !== 0 ? alphaCompare : a.name.length - b.name.length;
      });

    const sortedFolders = folder.items
      .filter((item) => item.type === "folder")
      .sort((a, b) => {
        const alphaCompare = a.name.localeCompare(b.name);
        return alphaCompare !== 0 ? alphaCompare : a.name.length - b.name.length;
      });

    // Find parent folders (folders that contain this folder)
    const parents = allFolders
      .filter((f) => f.items.some((item) => item.type === "folder" && item.folderId === folder.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      applicationItems: sortedApps,
      websiteItems: sortedWebsites,
      folderItems: sortedFolders,
      totalCount: folder.items.length,
      parentFolders: parents,
    };
  }, [folder.id, folder.items, applications, allFolders]);

  // Helper to get folder icon by folderId
  const getNestedFolderIcon = (folderId?: string) => {
    if (!folderId) return Icon.Folder;
    const nestedFolder = allFolders.find((f) => f.id === folderId);
    return nestedFolder ? getFolderIcon(nestedFolder.icon, nestedFolder.color) : Icon.Folder;
  };

  // Show preview even if empty but has parent folders
  if (totalCount === 0 && parentFolders.length === 0) {
    return undefined;
  }

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {parentFolders.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Label title={`Parent ${pluralize(parentFolders.length, "Folder")}`} />
              {parentFolders.map((parent) => (
                <List.Item.Detail.Metadata.Label
                  key={parent.id}
                  title={parent.name}
                  icon={getFolderIcon(parent.icon, parent.color)}
                />
              ))}
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          <List.Item.Detail.Metadata.Label
            title="Total Items"
            text={`${totalCount} ${pluralize(totalCount, "item")}`}
          />
          {applicationItems.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title={`Applications (${applicationItems.length})`} />
              {applicationItems.map((item) => (
                <List.Item.Detail.Metadata.Label
                  key={item.id}
                  title={getItemDisplayName(item, applications, allFolders)}
                  icon={getItemIcon(item, applications, allFolders)}
                />
              ))}
            </>
          )}
          {websiteItems.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title={`Websites (${websiteItems.length})`} />
              {websiteItems.map((item) => (
                <List.Item.Detail.Metadata.Label
                  key={item.id}
                  title={getItemDisplayName(item, applications, allFolders)}
                  icon={getItemIcon(item, applications, allFolders)}
                />
              ))}
            </>
          )}
          {folderItems.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title={`Nested Folders (${folderItems.length})`} />
              {folderItems.map((item) => (
                <List.Item.Detail.Metadata.Label
                  key={item.id}
                  title={item.name}
                  icon={getNestedFolderIcon(item.folderId)}
                />
              ))}
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
});

/**
 * Hook to render folder detail conditionally
 */
export function useFolderPreviewDetail(
  showPreviewPane: boolean,
  applications: Application[],
  allFolders?: Folder[],
): (folder: Folder) => React.ReactNode | undefined {
  return useMemo(() => {
    if (!showPreviewPane) {
      return () => undefined;
    }
    return (folder: Folder) => {
      const folders = allFolders || [];
      // Check if folder has items or has parent folders
      const hasParents = folders.some((f) =>
        f.items.some((item) => item.type === "folder" && item.folderId === folder.id),
      );
      if (folder.items.length === 0 && !hasParents) return undefined;
      return <FolderPreviewDetail folder={folder} applications={applications} allFolders={folders} />;
    };
  }, [showPreviewPane, applications, allFolders]);
}
