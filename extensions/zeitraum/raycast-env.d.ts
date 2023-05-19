/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** URL - The URL of your Zeitraum instance */
  url: string;
  /** API Token - The API token of your Zeitraum instance */
  apiToken: string;
  /** Stop previous time span - When creating a new time span, stop the previously running time span */
  stopPreviousRunning?: boolean;
};

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences;

declare namespace Preferences {
  /** Preferences accessible in the `trackCommand` command */
  export type TrackCommand = ExtensionPreferences & {};
  /** Preferences accessible in the `timeSpansCommand` command */
  export type TimeSpansCommand = ExtensionPreferences & {};
  /** Preferences accessible in the `createPresetCommand` command */
  export type CreatePresetCommand = ExtensionPreferences & {};
  /** Preferences accessible in the `presetsCommand` command */
  export type PresetsCommand = ExtensionPreferences & {};
  /** Preferences accessible in the `createTagCommand` command */
  export type CreateTagCommand = ExtensionPreferences & {};
}

declare namespace Arguments {
  /** Arguments passed to the `trackCommand` command */
  export type TrackCommand = {};
  /** Arguments passed to the `timeSpansCommand` command */
  export type TimeSpansCommand = {};
  /** Arguments passed to the `createPresetCommand` command */
  export type CreatePresetCommand = {};
  /** Arguments passed to the `presetsCommand` command */
  export type PresetsCommand = {};
  /** Arguments passed to the `createTagCommand` command */
  export type CreateTagCommand = {};
}
