/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Color coded usage warnings - Show color-coded usage warnings */
  "colorCoding": boolean,
  /** Codex - Track usage from OpenAI Codex CLI */
  "codexEnabled": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `see-usage` command */
  export type SeeUsage = ExtensionPreferences & {}
  /** Preferences accessible in the `manage-providers` command */
  export type ManageProviders = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `see-usage` command */
  export type SeeUsage = {}
  /** Arguments passed to the `manage-providers` command */
  export type ManageProviders = {}
}

