# Zhigeng Capture

Quickly capture **notes** and **todos** as raw Markdown drafts into your Obsidian vault — right from Raycast. The extension focuses on reliable, atomic saving; downstream processing (knowledge extraction, task registration, reminders) is handled by your own automation.

## Features

- **Two capture types**: Note and Todo. Meeting notes can be captured as notes.
- **Full body preservation**: Multi-line content, including all original whitespace, is saved verbatim.
- **Rich todo metadata**: Optional scheduling date, independent due date, and priority (Normal / High / Low).
- **Atomic writes**: Each capture uses a stable UUID-based filename, a content fingerprint, and non-overwriting atomic publishing so no partial or duplicate files are created.
- **Draft resilience**: Unsaved input is persisted locally and restored on next open. Saved captures are tracked with a receipt to prevent double-submission.
- **Legacy compatibility**: Old meeting-type drafts are migrated to notes while preserving their event dates.
- **Retry-safe**: Re-submitting a capture with the same ID and content finds the original file even if it was archived to `_raw/_archived/`.

## Requirements

- [Raycast](https://raycast.com) (macOS)
- An [Obsidian](https://obsidian.md) vault
- No additional CLI, Python, or API dependencies

## Setup

1. Install the extension from the Raycast Store (or import it locally).
2. Open the extension preferences and set **Vault Path** to the absolute path of your Obsidian vault (e.g. `/Users/you/Documents/MyVault` or `~/Documents/MyVault`).
3. Optionally assign a hotkey (suggested: `⌥⇧N`) and alias (suggested: `jg`) in Raycast Extensions settings.

## Usage

- Open the **Quick Capture** command.
- Choose **Note** or **Todo**.
- Enter a title (optional) and body. Press Enter for new lines.
- For todos, optionally set a scheduled date, due date, and priority.
- Press **⌘+Enter** to save.

Captured files are written to `_raw/` inside your vault as individual Markdown files with YAML frontmatter following the `zhigeng-capture/v1` schema. The extension only saves raw drafts; it does not process, analyze, or register them — that's up to your own downstream workflow.

### Filename Convention

```
{local-date}-{title-or-Capture}-{capture-uuid}.md
```

The date in the filename uses your device's local timezone. The capture timestamp inside the frontmatter is recorded in UTC with an IANA timezone field.

## Development

```sh
npm ci
npm run dev
```

Available scripts:
| Script | Purpose |
|--------|---------|
| `npm run build` | Production build + type check |
| `npm run dev` | Development mode with hot reload |
| `npm run lint` | Lint manifest, source, and formatting |
| `npm run typecheck` | TypeScript check only |
| `npm test` | Run all tests (uses temp vaults) |

## Downstream Consumers

The extension is intentionally minimal. It saves structured raw drafts that any downstream system can consume. The `zhigeng-capture/v1` frontmatter schema provides:
- `capture_id` — stable UUID for deduplication
- `capture_type` — `note` or `todo`
- `capture_time` / `capture_timezone` — when and where the capture happened
- `payload_sha256` — content fingerprint for integrity checks
- `scheduled`, `due`, `priority` — todo-specific scheduling fields

## License

MIT