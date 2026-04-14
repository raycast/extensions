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
  /** Preferences accessible in the `chat` command */
  export type Chat = ExtensionPreferences & {}
  /** Preferences accessible in the `quick-ask` command */
  export type QuickAsk = ExtensionPreferences & {}
  /** Preferences accessible in the `fix-grammar` command */
  export type FixGrammar = ExtensionPreferences & {}
  /** Preferences accessible in the `translate` command */
  export type Translate = ExtensionPreferences & {}
  /** Preferences accessible in the `connect` command */
  export type Connect = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `chat` command */
  export type Chat = {}
  /** Arguments passed to the `quick-ask` command */
  export type QuickAsk = {}
  /** Arguments passed to the `fix-grammar` command */
  export type FixGrammar = {}
  /** Arguments passed to the `translate` command */
  export type Translate = {}
  /** Arguments passed to the `connect` command */
  export type Connect = {}
}

