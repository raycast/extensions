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
  /** Preferences accessible in the `set-brightness` command */
  export type SetBrightness = ExtensionPreferences & {}
  /** Preferences accessible in the `max-brightness` command */
  export type MaxBrightness = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `set-brightness` command */
  export type SetBrightness = {}
  /** Arguments passed to the `max-brightness` command */
  export type MaxBrightness = {}
}

