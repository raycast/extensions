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
  /** Preferences accessible in the `look-up-block` command */
  export type LookUpBlock = ExtensionPreferences & {}
  /** Preferences accessible in the `price-dashboard` command */
  export type PriceDashboard = ExtensionPreferences & {}
  /** Preferences accessible in the `sats-usd-converter` command */
  export type SatsUsdConverter = ExtensionPreferences & {}
  /** Preferences accessible in the `look-up-transaction` command */
  export type LookUpTransaction = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `look-up-block` command */
  export type LookUpBlock = {
  /** Block height (e.g. 680000) */
  "height": string
}
  /** Arguments passed to the `price-dashboard` command */
  export type PriceDashboard = {}
  /** Arguments passed to the `sats-usd-converter` command */
  export type SatsUsdConverter = {
  /** Amount (e.g. 100000 or 0.005 BTC) */
  "amount": string,
  /** Direction */
  "direction": "sats-to-usd" | "usd-to-sats"
}
  /** Arguments passed to the `look-up-transaction` command */
  export type LookUpTransaction = {
  /** Transaction ID (TXID) */
  "txid": string
}
}

