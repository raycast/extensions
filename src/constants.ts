import { Icon } from "@raycast/api";

// ===== Polling Intervals =====
/** How often to poll for preference changes (ms) */
export const PREF_POLL_INTERVAL = 2000;

/** How often to poll for folder data updates (ms) */
export const FOLDER_POLL_INTERVAL = 1000;

/** How often to check for running applications (ms) */
export const RUNNING_APPS_POLL_INTERVAL = 3000;

// ===== Sorting Defaults =====
export const DEFAULT_SORT = "alphabetical-asc";
export const NO_SORT = "none";

// ===== Special Values =====
/** Sentinel value for "Create New Folder" option in tag pickers */
export const CREATE_NEW_FOLDER_VALUE = "__CREATE_NEW_FOLDER__";

// ===== Empty View States =====
export const EMPTY_FOLDER_VIEW = {
  icon: Icon.Folder,
  title: "Empty folder",
  description: "No items in this folder",
} as const;

export const FOLDER_NOT_FOUND_VIEW = {
  icon: Icon.ExclamationMark,
  title: "Folder not found",
  description: "This folder may have been deleted",
} as const;

export const NO_FOLDERS_VIEW = {
  icon: Icon.Folder,
  title: "No folders yet",
  description: "Press ⌘N to create your first folder",
} as const;
