/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Default Timeout - Default timeout for ping attempts in seconds */
  "defaultTimeout": string,
  /** Default Max Threads - Default maximum concurrent threads for scanning */
  "defaultMaxThreads": string,
  /** Default Recommendations - Default number of IP recommendations to show */
  "defaultRecommendations": string,
  /** Auto-scan on Open - Automatically start scanning when opening the extension */
  "autoScanOnOpen": boolean,
  /** Show Progress Bar - Display progress bar during scanning */
  "showProgressBar": boolean,
  /** Scan Common Ranges - Focus on common IP ranges for faster scanning */
  "scanCommonRanges": boolean,
  /** Gather Device Information - Get MAC addresses, hostnames, and manufacturer details */
  "gatherDeviceInfo": boolean,
  /** Scan Open Ports - Check for open ports on discovered devices */
  "scanPorts": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
}

