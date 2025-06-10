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
  /** Preferences accessible in the `list-mcp-servers` command */
  export type ListMcpServers = ExtensionPreferences & {}
  /** Preferences accessible in the `add-mcp-server` command */
  export type AddMcpServer = ExtensionPreferences & {}
  /** Preferences accessible in the `search-mcp-servers` command */
  export type SearchMcpServers = ExtensionPreferences & {}
  /** Preferences accessible in the `remove-mcp-server` command */
  export type RemoveMcpServer = ExtensionPreferences & {}
  /** Preferences accessible in the `view-raw-configs` command */
  export type ViewRawConfigs = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `list-mcp-servers` command */
  export type ListMcpServers = {}
  /** Arguments passed to the `add-mcp-server` command */
  export type AddMcpServer = {}
  /** Arguments passed to the `search-mcp-servers` command */
  export type SearchMcpServers = {}
  /** Arguments passed to the `remove-mcp-server` command */
  export type RemoveMcpServer = {}
  /** Arguments passed to the `view-raw-configs` command */
  export type ViewRawConfigs = {}
}

