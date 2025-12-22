import { useCallback, useMemo } from "react";
import { Clipboard, showToast, Toast } from "@raycast/api";
import { Folder } from "../types";
import {
  collectFolderUrls,
  formatUrlsAsMarkdown,
  formatUrlsAsList,
  countUrls,
  pluralize,
  CollectedUrl,
} from "../utils";

interface UseCopyUrlsResult {
  /** All collected URLs from the folder (including nested) */
  collectedUrls: CollectedUrl[];
  /** Whether there are any URLs to copy */
  hasUrls: boolean;
  /** Copy URLs as markdown with nested structure */
  copyAsMarkdown: () => Promise<void>;
  /** Copy URLs as plain list sorted by length */
  copyAsList: () => Promise<void>;
}

/**
 * Hook for copying URLs from a folder
 * Handles both markdown and plain list formats
 * Reusable across folder list and folder contents views
 */
export function useCopyUrls(folder: Folder | undefined, allFolders: Folder[]): UseCopyUrlsResult {
  const collectedUrls = useMemo(() => (folder ? collectFolderUrls(folder, allFolders) : []), [folder, allFolders]);

  const hasUrls = collectedUrls.length > 0;

  const copyAsMarkdown = useCallback(async () => {
    if (!hasUrls || !folder) {
      await showToast({ title: "No URLs to copy", message: "This folder has no websites", style: Toast.Style.Failure });
      return;
    }

    const markdown = formatUrlsAsMarkdown(collectedUrls, folder.name);
    await Clipboard.copy(markdown);

    const urlCount = countUrls(collectedUrls);
    await showToast({
      title: "Copied as Markdown",
      message: `${urlCount} ${pluralize(urlCount, "URL")}`,
      style: Toast.Style.Success,
    });
  }, [collectedUrls, hasUrls, folder]);

  const copyAsList = useCallback(async () => {
    if (!hasUrls) {
      await showToast({ title: "No URLs to copy", message: "This folder has no websites", style: Toast.Style.Failure });
      return;
    }

    const list = formatUrlsAsList(collectedUrls);
    await Clipboard.copy(list);

    const urlCount = countUrls(collectedUrls);
    await showToast({
      title: "Copied as List",
      message: `${urlCount} ${pluralize(urlCount, "URL")} (sorted by length)`,
      style: Toast.Style.Success,
    });
  }, [collectedUrls, hasUrls]);

  return {
    collectedUrls,
    hasUrls,
    copyAsMarkdown,
    copyAsList,
  };
}
