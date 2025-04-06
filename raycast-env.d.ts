/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Token - The API token for the Shortcut */
  "apiToken": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `assigned-stories` command */
  export type AssignedStories = ExtensionPreferences & {}
  /** Preferences accessible in the `show-iterations` command */
  export type ShowIterations = ExtensionPreferences & {}
  /** Preferences accessible in the `show-epics` command */
  export type ShowEpics = ExtensionPreferences & {}
  /** Preferences accessible in the `create-story` command */
  export type CreateStory = ExtensionPreferences & {}
  /** Preferences accessible in the `search-stories` command */
  export type SearchStories = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `assigned-stories` command */
  export type AssignedStories = {}
  /** Arguments passed to the `show-iterations` command */
  export type ShowIterations = {}
  /** Arguments passed to the `show-epics` command */
  export type ShowEpics = {}
  /** Arguments passed to the `create-story` command */
  export type CreateStory = {}
  /** Arguments passed to the `search-stories` command */
  export type SearchStories = {}
}

