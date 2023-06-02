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
  /** Preferences accessible in the `timestamps` command */
  export type Timestamps = ExtensionPreferences & {}
  /** Preferences accessible in the `php-date-formats` command */
  export type PhpDateFormats = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `timestamps` command */
  export type Timestamps = {}
  /** Arguments passed to the `php-date-formats` command */
  export type PhpDateFormats = {}
}
