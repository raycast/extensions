/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Language / 语言 - Choose your preferred language / 选择您的首选语言 */
  "language": "zh" | "en"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `format-string` command */
  export type FormatString = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `format-string` command */
  export type FormatString = {}
}

