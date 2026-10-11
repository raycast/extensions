# Changelog

All notable changes to this project will be documented in this file.

## [Website Search Fallback] - {PR_MERGE_DATE}

### Added

- "Search on the Z-Library website" row at the end of the results (and when nothing is found), which opens the website's own search for your query in the browser, since the website can list books the CLI search does not return

### Changed

- The "No results" screen is replaced by the same website search row

## [Windows Support] - 2026-09-25

### Added

- Windows support: extension is now installable from the Store on Windows
- Auto-detect `zlib.exe` from PATH instead of the macOS Homebrew paths when running on Windows
- Windows install instructions (`winget install heartleo.zlib`) in the README
- Per-platform keyboard shortcuts (`⌘` on macOS, `Ctrl` on Windows) so the actions are reachable by keyboard on Windows

## [Bulk Download] - 2026-09-11

### Added

- Select multiple books in Search Books and download them all at once with Download Selected
- Add to Queue action to save books for later without downloading immediately
- New Download Queue command to review, bulk-download, and manage saved books, even across Raycast restarts
- Downloaded queue items are marked Downloaded and kept until manually cleared or removed

## [1.0.0] - 2026-09-10

### Added

- Initial release
- Search Books command for querying Z-Library
- Download books directly to your configured folder
- Open books in browser
- Copy book ID action
- Configurable zlib binary path
- Configurable download directory
- Z-Library domain override preference for handling blocked mirrors
- Real-time search with 30 results per query
- Display book metadata (authors, year, format, size, rating)
