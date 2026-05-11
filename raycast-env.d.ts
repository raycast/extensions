/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Connection Type - Choose between self-hosted/local Temporal or Temporal Cloud */
  "connectionType": "local" | "cloud",
  /** Namespace - Temporal namespace to connect to */
  "namespace": string,
  /** API Key - Temporal Cloud API key (required for Cloud connection) */
  "apiKey"?: string,
  /** Temporal UI URL - URL to Temporal Web UI - also used for API access (e.g., http://localhost:8080 for Docker, http://localhost:8233 for dev server) */
  "temporalUiUrl": string
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

