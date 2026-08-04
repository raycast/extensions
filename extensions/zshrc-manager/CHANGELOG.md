# Changelog

## [One parser for every surface] - 2026-08-04

### Fixed

- Statistics, section counts, and the type views now agree — all of them derive from a single parser (the pattern registry), so the count you see on a section can no longer differ from the list you drill into. Previously two independently written parser systems could disagree about what is in the file
- Multi-line `plugins=(…)`, `path+=(…)` and `fpath=(…)` array declarations — the standard Oh My Zsh layout — are now parsed everywhere; sections and search previously missed them
- PATH and FPATH declarations in all supported forms (`export`/`typeset -x`/`declare -x`, `+=` string append, array append/set, `$PATH:`-relative, and plain assignment) are recognized consistently across every surface
- Keybinding counts no longer include bare mode lines like `bindkey -e` that the Keybindings view has nothing to show for
- Array parsing follows zsh quoting: quoted elements may contain whitespace, parentheses and escaped quotes; `$(…)` command substitutions stay one element with their text kept verbatim; inline comments inside array bodies are ignored
- A comment inside a multi-line array that happens to match a section-header format (`## group`, `# Section: X`) no longer splits the array — per-section counts stay consistent with the views, and adding an item can no longer insert a line into the middle of an array
- Sources with quoted operands or trailing inline comments resolve correctly in the detail pane's `Source Exists` fact; plugin install checks honor `ZSH_CUSTOM`/`ZSH` set as plain (unexported) assignments; `$HOMEBREW_PREFIX`-style variables are no longer mis-expanded as `$HOME`
- **Undo now actually reverts adds and edits.** History entries for add/edit operations recorded the post-change file as their restore point, so undoing them silently restored the very state you were trying to revert. Every write now records the pre-change snapshot, and only after the write is verified — so a failed write can no longer leave a restore point for a change that never happened

### Changed

- Every parsed entry now carries the line it was defined on internally, laying the groundwork for addressing duplicate definitions directly

## [Resolved facts: shadowed commands, missing sources, missing plugins] - 2026-08-03

### Added

- Aliases that shadow a real command now say so: the detail pane shows a `Shadows` row with the executable's path when an alias masks something on PATH (scanning the environment PATH plus PATH entries declared in the config — no subprocess involved)
- Sources gain a `Source Exists` row — Yes, Missing, or Unknown. Paths that cannot be expanded without a shell (e.g. `${XDG_CACHE_HOME:-$HOME/.cache}`) deliberately report Unknown rather than a false Missing
- Plugins gain an `Installed` row, checked against the Oh My Zsh plugins directories (`$ZSH_CUSTOM` first, then `$ZSH` or `~/.oh-my-zsh` as the base). When no Oh My Zsh installation exists, the answer is Unknown — absence of OMZ says nothing about other plugin managers
- The three facts also surface as list warning triangles (the same affordance duplicates already use), so problems are scannable without opening each detail pane: orange for a shadowing alias, red for a missing source file or uninstalled plugin. The "With Warnings" filter now covers them, and Unknown never warns — only definite problems do

### Fixed

- `LIMITATIONS.md` no longer claims extensions cannot spawn child processes (they can — the limitation is the absence of a terminal UI), and the file-watching limitation is narrowed to background watching: `fs.watch` works while a command is open

## [Actions everywhere and secret masking] - 2026-08-03

### Added

- Search results can now be edited and deleted in place (aliases and exports) — the fastest way to find an item is no longer the only place you cannot act on one
- Copy Value (`⌘C`) and Copy Name (`⌘⇧C`) actions on every entry in every view, replacing the mislabeled "Copy Name/Value" action that only copied the name
- Secret values (names matching KEY, TOKEN, SECRET, PASSWORD, PASSWD, CREDENTIAL, AUTH, PRIVATE, API) are now masked everywhere they render — lists, detail panes, section previews, and section markdown — with a Reveal Value action (`⌘U`) and a Secret tag; copy actions always copy the real value, copy it concealed (kept out of clipboard-manager history), and never echo it in the confirmation toast

### Fixed

- Copying a value on its own is now possible — previously the "Copy Name/Value" action copied only the name
- Copied export values no longer include the quotes from the file, and copied definitions are reproduced as written instead of being re-quoted (which could change what the line meant when pasted back)
- Editing or deleting an entry whose name is defined in more than one section now targets the definition in the entry's own section; when the exact definition cannot be identified, the extension refuses with a clear message instead of silently rewriting the first match in the file
- Editing an entry no longer deletes its inline comment, and deleting an entry no longer leaves a blank line behind
- Brand icons (Docker, Python, npm, and all alias-collection icons) render again on current Raycast builds, which stopped drawing tinted data-URL SVGs; brand colors are now baked into the icons instead

### Changed

- The Statistics view's built-in search now shares one implementation with the rest of the extension, so searching from the landing view gets the same edit, delete, copy, and secret-masking behavior
- Pressing Enter on overview and summary rows now opens `~/.zshrc` or refreshes instead of triggering Undo Last Change

### Removed

- The separate Global Search view — the landing view's search does the same job, so the dropdown entry was redundant
- Dead code: unused `sanitizeMarkdown` and `escapeShellContent` helpers, six unused enums, and an unreachable section list view with its item components

## [Read/write correctness] - 2026-07-31

### Fixed

- Configurations larger than 10 KB are no longer silently truncated — all views, statistics, health checks, search, and the backup diff now see the entire file
- Saving is no longer permanently blocked by pre-existing content (e.g. a long `PATH=` line); validation findings now show a confirmation dialog with Save Anyway / Cancel instead of failing the write
- Coverage thresholds in the test config are now actually enforced (they were previously nested in a shape Vitest ignores)

## [2.0.0] - 2026-01-26

### Added

- Alias collections from external repository (curated, Oh My Zsh plugins, external sources)
- Browse and add aliases from curated libraries (Git, Docker, Kubernetes, npm, etc.)
- One-click import from Oh My Zsh plugin aliases
- Undo/redo history with session-based tracking
- History view to view and restore previous states
- Health check dashboard to detect configuration issues
- Backup manager with restore and diff capabilities
- PATH entries management
- Keybindings management

### Changed

- Refactored architecture into reusable components, hooks, and utilities
- Collections are fetched on-demand via manifest for independent updates
- Enhanced global search with multi-field filtering across all content types

## [1.0.0] - 2025-11-07

### Added

- Initial release of Zshrc Manager extension
- Core functionality for managing zshrc configuration
- Support for aliases, exports, functions, plugins, sources, evals, and setopts
- Search and filtering capabilities
- Section organization and detail views
- Form-based editing for aliases and exports
- Statistics overview of zshrc configuration
- Copy-to-clipboard functionality for all content types
- Keyboard shortcuts for common actions

### Changed

- Improved error messages with user-friendly descriptions
- Enhanced search functionality with multi-field filtering
- Optimized file reading with size validation and truncation

### Fixed

- Fixed pluralization logic for count displays
- Improved error handling in form components
- Enhanced validation for alias names and export variables
- Fixed search filtering edge cases
