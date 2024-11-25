/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** LibreView Username - Your LibreView account username/email */
  "username": string,
  /** LibreView Password - Your LibreView account password */
  "password": string,
  /** Glucose Unit - Choose between mmol/L and mg/dL. Note: Please update your thresholds after changing units */
  "unit": "mmol" | "mgdl",
  /** Enable Glucose Alerts - Show notifications when glucose levels are outside your target range */
  "alertsEnabled": boolean,
  /** Low Glucose Threshold - Alert when glucose falls below this value. Enter value in your selected unit (mmol/L or mg/dL) */
  "lowThreshold"?: string,
  /** High Glucose Threshold - Alert when glucose rises above this value. Enter value in your selected unit (mmol/L or mg/dL) */
  "highThreshold"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `menubar` command */
  export type Menubar = ExtensionPreferences & {}
  /** Preferences accessible in the `dashboard` command */
  export type Dashboard = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `menubar` command */
  export type Menubar = {}
  /** Arguments passed to the `dashboard` command */
  export type Dashboard = {}
}

