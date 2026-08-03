# Changelog

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
