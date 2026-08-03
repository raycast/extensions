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
  /** Preferences accessible in the `latest-teardowns` command */
  export type LatestTeardowns = ExtensionPreferences & {}
  /** Preferences accessible in the `teardown-of-the-day` command */
  export type TeardownOfTheDay = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `latest-teardowns` command */
  export type LatestTeardowns = {}
  /** Arguments passed to the `teardown-of-the-day` command */
  export type TeardownOfTheDay = {}
}

