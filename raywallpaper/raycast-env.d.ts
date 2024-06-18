/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `raywallpaper` command */
  export type Raywallpaper = ExtensionPreferences & {
  /** Grid Size - Grid size of the wallpaper picker */
  "gridSize": "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8",
  /** Shows Wallpaper Titles - Shows the wallpaper titles in the picker */
  "wallpaperTitle"?: boolean
}
}

declare namespace Arguments {
  /** Arguments passed to the `raywallpaper` command */
  export type Raywallpaper = {}
}


