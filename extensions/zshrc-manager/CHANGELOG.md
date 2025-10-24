# Changelog

All notable changes to the Zshrc Manager extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - {PR_MERGE_DATE}

### Added

- Initial release of Zshrc Manager extension
- Core functionality for managing zshrc configuration
- Support for aliases, exports, functions, plugins, sources, evals, and setopts
- Basic search and filtering capabilities
- Section organization and detail views
- Form-based editing for aliases and exports
- Comprehensive statistics overview of zshrc configuration
- Smart search across all content types with real-time filtering
- Section-based organization of zshrc content
- Graceful error handling with cached data fallbacks
- Input validation for aliases and exports
- Keyboard shortcuts for common actions
- Copy-to-clipboard functionality for all content types

### Changed

- Refactored codebase for better maintainability and performance
- Improved error messages with user-friendly descriptions
- Enhanced search functionality with multi-field filtering
- Optimized file reading with size validation and truncation

### Fixed

- Fixed pluralization logic for count displays
- Improved error handling in form components
- Enhanced validation for alias names and export variables
- Fixed search filtering edge cases

### Commands

- `zshrc-statistics` - View configuration overview and statistics
- `sections` - Browse and manage logical sections
- `aliases` - Manage shell aliases
- `exports` - Manage environment variable exports
- `functions` - View and manage shell functions
- `plugins` - Manage zsh plugins
- `sources` - View source commands
- `evals` - Manage eval commands
- `setopts` - View setopt configurations

### Features

- File I/O operations with error handling
- Content parsing and organization
- Search and filter functionality
- Form validation and error handling
- Copy-to-clipboard actions
- Integration with Raycast API

## [0.1.0] - 2024-10-20

### Added

- Initial development version
- Basic file reading and parsing
- Simple list-based interface
- Core zshrc content management

---

## Release Notes Format

### Version Numbering

- **Major** (X.0.0): Breaking changes or major new features
- **Minor** (0.X.0): New features, backwards compatible
- **Patch** (0.0.X): Bug fixes, backwards compatible

### Categories

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Features that will be removed
- **Removed**: Features that have been removed
- **Fixed**: Bug fixes
- **Security**: Security-related changes

### Store Submission Notes

- Each release includes comprehensive testing
- All features are documented and tested
- Error handling is robust and user-friendly
- Performance is optimized for large zshrc files
- Accessibility features are implemented where applicable
