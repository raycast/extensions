<h1 align="center">⚠️ Raycast Platform Limitations</h1>

<p align="center">
  This document outlines features that cannot be implemented due to Raycast's platform constraints.<br>
  These are <strong>architectural limitations</strong>, not bugs or missing features.
</p>

---

## 📋 Table of Contents

- [Cannot Be Implemented](#-cannot-be-implemented)
- [Partially Limited Features](#-partially-limited-features)
- [API Reference](#-api-reference)

---

## 🚫 Cannot Be Implemented

<details>
<summary><strong>🖥️ Live Shell Command Execution</strong></summary>

|                             |                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **What users might expect** | Execute shell commands and see real-time output within the extension                                                              |
| **Why it's not possible**   | Raycast extensions run in a sandboxed JavaScript environment without access to spawn child processes or capture stdout/stderr     |
| **Workaround**              | Use `Action.Open` to open Terminal.app or iTerm with a command, or `Action.CopyToClipboard` to copy commands for manual execution |

</details>

<details>
<summary><strong>👁️ Real-Time File Watching</strong></summary>

|                             |                                                                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **What users might expect** | Automatic refresh when `~/.zshrc` is modified externally                                                                                        |
| **Why it's not possible**   | Raycast extensions cannot run persistent background processes or register file system watchers. The extension only runs when explicitly invoked |
| **Workaround**              | Manual refresh via `Cmd+R`. The extension checks file modification timestamps on launch to invalidate stale caches                              |

</details>

<details>
<summary><strong>🎨 Rich Text Editor / Syntax Highlighting in Forms</strong></summary>

|                             |                                                                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **What users might expect** | Syntax-highlighted code editing when modifying aliases, exports, or other entries                                                               |
| **Why it's not possible**   | Raycast's `Form.TextField` and `Form.TextArea` components are plain text inputs only. There is no API for custom styling or syntax highlighting |
| **Workaround**              | The extension shows a syntax-highlighted preview in an adjacent Detail pane using markdown code blocks while editing                            |

</details>

<details>
<summary><strong>💡 Inline Autocomplete in Text Fields</strong></summary>

|                             |                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **What users might expect** | Type-ahead suggestions when entering commands or paths                                                                               |
| **Why it's not possible**   | `Form.TextField` does not support dynamic autocomplete or typeahead. Only `Form.Dropdown` provides selection from predefined options |
| **Workaround**              | Use dropdown fields where a finite set of options exists (e.g., section selection). For free-form text, users must type manually     |

</details>

<details>
<summary><strong>⌨️ Custom Keyboard Shortcuts Within Forms</strong></summary>

|                             |                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What users might expect** | Custom keybindings for common editing operations (e.g., `Ctrl+D` to duplicate a line)                                                                   |
| **Why it's not possible**   | Raycast's keyboard shortcut system only applies to `Action` components in the `ActionPanel`. There is no API to intercept keystrokes within form fields |
| **Workaround**              | Standard OS text editing shortcuts (copy, paste, select all) work as expected                                                                           |

</details>

<details>
<summary><strong>🖳 Embedded Terminal Emulator</strong></summary>

|                             |                                                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What users might expect** | A terminal pane within Raycast to test commands or see shell output                                                                                                   |
| **Why it's not possible**   | Raycast extensions cannot render custom UI components beyond the provided primitives (List, Detail, Form, Grid). There is no WebView, Canvas, or custom component API |
| **Workaround**              | Use `Action.Open` to launch the system terminal application                                                                                                           |

</details>

<details>
<summary><strong>✅ True Shell Syntax Validation</strong></summary>

|                             |                                                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What users might expect** | Real syntax checking using zsh's parser (equivalent to `zsh -n`)                                                                                         |
| **Why it's not possible**   | This would require executing `zsh -n` and capturing its output, which is not possible in the sandbox                                                     |
| **Workaround**              | The extension performs structural validation (unmatched quotes, basic pattern matching) using JavaScript regex, but cannot catch all shell syntax errors |

</details>

<details>
<summary><strong>☁️ Persistent Background Sync</strong></summary>

|                             |                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **What users might expect** | Sync changes across devices or with a remote backup                                                                  |
| **Why it's not possible**   | Extensions cannot run background processes, schedule tasks, or maintain network connections when not actively in use |
| **Workaround**              | Manual export/import functionality is available for backup purposes                                                  |

</details>

---

## ⚡ Partially Limited Features

These features are possible but with constraints:

| Feature                | Limitation                         | What We Can Do                                                  |
| ---------------------- | ---------------------------------- | --------------------------------------------------------------- |
| ↩️ **Undo/Redo**       | No persistent undo across sessions | Session-based undo via LocalStorage (clears on Raycast restart) |
| ☑️ **Bulk Operations** | No native multi-select in List     | Track selection state manually via LocalStorage and accessories |
| 📊 **Diff View**       | No side-by-side diff component     | Unified diff in markdown within Detail view                     |
| 🔄 **Shell Reload**    | Cannot execute `source ~/.zshrc`   | Copy command to clipboard with instructions                     |

---

## 📚 API Reference

For the most current information on Raycast's capabilities and limitations:

| Resource                | Link                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 📖 API Documentation    | [developers.raycast.com/api-reference](https://developers.raycast.com/api-reference)                             |
| 📋 Extension Guidelines | [developers.raycast.com/basics/publish-an-extension](https://developers.raycast.com/basics/publish-an-extension) |

---

<p align="center">
  <em>Last updated: January 2026</em>
</p>
