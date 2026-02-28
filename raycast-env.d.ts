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
  /** Preferences accessible in the `add-image-hash` command */
  export type AddImageHash = ExtensionPreferences & {
  /** Image Folder - The folder containing images to rename. */
  "folder": string
}
}

declare namespace Arguments {
  /** Arguments passed to the `add-image-hash` command */
  export type AddImageHash = {}
}

