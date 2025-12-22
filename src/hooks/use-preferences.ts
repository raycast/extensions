import { getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { PREF_POLL_INTERVAL } from "../constants";

/**
 * Folder contents preferences
 */
export interface FolderContentsPreferences {
  folderContentsSortPrimary: string;
  folderContentsSortSecondary: string;
  folderContentsSortTertiary: string;
  folderContentsViewType: string;
  gridSeparateSections: boolean;
  showPreviewPane: boolean;
}

/**
 * Hook for folder contents preferences with polling
 * Polls for changes every 2 seconds to reflect preference updates
 */
export function useFolderContentsPreferences(): FolderContentsPreferences {
  const [prefs, setPrefs] = useState<FolderContentsPreferences>(() => getPreferenceValues<FolderContentsPreferences>());

  useEffect(() => {
    const update = () => {
      const current = getPreferenceValues<FolderContentsPreferences>();
      setPrefs((prev) => {
        // Only update if any preference changed
        if (
          prev.folderContentsSortPrimary !== current.folderContentsSortPrimary ||
          prev.folderContentsSortSecondary !== current.folderContentsSortSecondary ||
          prev.folderContentsSortTertiary !== current.folderContentsSortTertiary ||
          prev.folderContentsViewType !== current.folderContentsViewType ||
          prev.gridSeparateSections !== current.gridSeparateSections ||
          prev.showPreviewPane !== current.showPreviewPane
        ) {
          return current;
        }
        return prev;
      });
    };

    const interval = setInterval(update, PREF_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return prefs;
}
