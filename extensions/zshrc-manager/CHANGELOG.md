# Changelog

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
