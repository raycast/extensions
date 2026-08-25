/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** zlib Binary Path - Path to the zlib executable */
  "zlibPath": string,
  /** Download Directory - Where downloaded books are saved */
  "downloadDir": string,
  /** Z-Library Domain Override - Optional. Only set this if your saved login session uses a blocked domain (see `zlib doctor --eapi`). */
  "zlibDomain": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-books` command */
  export type SearchBooks = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-books` command */
  export type SearchBooks = {}
}

