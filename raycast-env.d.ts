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
  /** Preferences accessible in the `list-envvars` command */
  export type ListEnvvars = ExtensionPreferences & {}
  /** Preferences accessible in the `edit-path` command */
  export type EditPath = ExtensionPreferences & {}
  /** Preferences accessible in the `add-envvar` command */
  export type AddEnvvar = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `list-envvars` command */
  export type ListEnvvars = {}
  /** Arguments passed to the `edit-path` command */
  export type EditPath = {}
  /** Arguments passed to the `add-envvar` command */
  export type AddEnvvar = {}
}

