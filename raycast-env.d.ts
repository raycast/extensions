/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Ollama API URL - The URL of your Ollama instance */
  "ollamaUrl": string,
  /** Default Model - Model to use (leave empty to pick each time) */
  "defaultModel": string,
  /** MCP Config File - Path to MCP config JSON file */
  "mcpConfigPath": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `ollama-chat` command */
  export type OllamaChat = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `ollama-chat` command */
  export type OllamaChat = {}
}

