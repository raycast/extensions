/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Clusters Configuration - JSON array of cluster configurations. Each cluster: {"name": "Display Name", "url": "http://localhost:8080", "namespace": "default", "apiKey": "optional-api-key"} */
  "clusters": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-workflows` command */
  export type SearchWorkflows = ExtensionPreferences & {}
  /** Preferences accessible in the `dashboard` command */
  export type Dashboard = ExtensionPreferences & {}
  /** Preferences accessible in the `start-workflow` command */
  export type StartWorkflow = ExtensionPreferences & {}
  /** Preferences accessible in the `schedules` command */
  export type Schedules = ExtensionPreferences & {}
  /** Preferences accessible in the `search-attributes` command */
  export type SearchAttributes = ExtensionPreferences & {}
  /** Preferences accessible in the `batch-operations` command */
  export type BatchOperations = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-workflows` command */
  export type SearchWorkflows = {}
  /** Arguments passed to the `dashboard` command */
  export type Dashboard = {}
  /** Arguments passed to the `start-workflow` command */
  export type StartWorkflow = {}
  /** Arguments passed to the `schedules` command */
  export type Schedules = {}
  /** Arguments passed to the `search-attributes` command */
  export type SearchAttributes = {}
  /** Arguments passed to the `batch-operations` command */
  export type BatchOperations = {}
}

