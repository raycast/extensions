/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** 🥇 Primary Sort - Primary sort method for items inside bundles */
  "folderContentsSortPrimary": "alphabetical-asc" | "alphabetical-desc" | "length-asc" | "length-desc" | "recent-asc" | "recent-desc" | "none",
  /** 🥈 Secondary Sort - Used when items are equal by the first sort */
  "folderContentsSortSecondary": "alphabetical-asc" | "alphabetical-desc" | "length-asc" | "length-desc" | "recent-asc" | "recent-desc" | "none",
  /** 🥉 Tertiary Sort - Used when items are equal by the first two sorts */
  "folderContentsSortTertiary": "alphabetical-asc" | "alphabetical-desc" | "length-asc" | "length-desc" | "recent-asc" | "recent-desc" | "none",
  /** 📋 View Type - How to display items when viewing bundle contents */
  "folderContentsViewType": "list" | "grid",
  /** Preview Pane - Show bundle contents in a preview pane beside the bundle list */
  "showPreviewPane": boolean,
  /** Bundle Contents - Group apps, websites, and bundles into separate sections */
  "gridSeparateSections": boolean,
  /** Default Bundle Color - CSS color name or hex code for new bundles */
  "defaultFolderColor"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
}

