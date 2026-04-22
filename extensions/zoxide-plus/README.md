# Zoxide Plus

Jump straight to any folder on your Mac by name. Type a few letters, hit enter, and open it in Finder, your terminal, or your editor — ranked by how often and recently you've used it, powered by [zoxide](https://github.com/ajeetdsouza/zoxide).

Matches on folder names, not full paths, so typing `desk` goes straight to `Desktop` — not to every directory nested below it.

## Requirements

This extension shells out to the `zoxide` binary, so you need it installed:

```bash
brew install zoxide
```

If you don't already use zoxide in your shell, follow the [setup instructions](https://github.com/ajeetdsouza/zoxide#installation) to hook it into your shell — that's how zoxide learns which folders you use.

## Commands

### Jump to Folder

Search your zoxide index and open the match.

| Action | Shortcut |
| --- | --- |
| Open in Finder | `↵` |
| Open in your terminal | `⌘↵` |
| Open in your editor | `⌘⇧↵` |
| Reveal in Finder | `⌘F` |
| Boost in Zoxide (bump score) | `⌘B` |
| Copy Path | `⌘.` |

Each result shows its frecency score as a badge on the right, and the result list header shows the total count.

### Add Path to Zoxide

Add a folder to zoxide's index without needing to `cd` into it.

- If you have an item selected in Finder, it's added immediately (folder itself, or the containing folder if a file is selected)
- Otherwise, a folder picker opens so you can choose manually

## Preferences

Configurable under Raycast → Settings → Extensions → Zoxide Plus:

- **Terminal** — app used by the "Open in Terminal" action (default: Terminal.app)
- **Editor** — app used by the "Open in Editor" action (default: Visual Studio Code)

Both are native macOS app pickers, so any installed app works.
