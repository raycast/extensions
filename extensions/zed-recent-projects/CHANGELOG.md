#  Zed Recent Projects Changelog

## [Enhancements] - 2026-01-15

- Add colored dots per project for easy visual identification
- Show green "Open" tag for projects currently open in Zed
- Reorder list when opening a project to show it at the top
- Add "Close Project" action to close open Zed windows directly (macOS only)
- Add "open" and "closed" keywords to filter projects by typing in the search bar
## [Windows Support] - 2025-12-28

- Added Windows support.

## [Update] - 2025-11-03

Update to @raycast/api 1.103, fix types, and add tests to Zed db schema v30.

## [Fixes] - 2025-10-15

- Fix projects loading if user has custom configuration in ~/.sqliterc.

## [Fixes] - 2025-09-16

- Fix broken pinned entries cache.

## [Refactor] - 2025-09-13

- Internal refactoring and cleanup. Added tests.

## [Fixes] - 2025-09-09

- Handle Zed sqlite schema version 28+

## [Fixes] - 2025-09-08

- Use latest Zed sqlite schema

## [Fixes] - 2025-07-16

- Fix missing local projects

## [Fixes] - 2025-07-07

- Add `Zed Dev` app build option

## [Fixes] - 2025-04-03

- Show Git branch label based on extension preferences

## [Enhancements] - 2025-04-02

- Added a Git branch label for each project

## [Fixes] - 2025-03-25

- Fix remove recent remote projects

## [Enhancements] - 2025-03-24

- Added remove actions for single and all recent projects

## [Add support for remote projects] - 2025-03-10

- Added remote project support for `Search Recent Projects`.

## [Fixes] 2024-06-20

- Fixed an issue that the same entry is shown multiple times in the recent projects list.

## [Fixes] 2024-05-02

- Fixed issue with query to workspaces table. The workspace_location column has been renamed to local_paths.

## [Switch to builtin Zed recent projects] - 2024-03-09

- `Search Recent Projects` switched to use the builtin Zed recent projects.
- Removed `Import VS Code Projects` command.

## [Enhancements] - 2024-02-12

- `Search Recent Projects` command now allows to pin and order projects to the top of the list.
- Added preference for choosing to run commands using Zed or Zed Preview.

## ["Open With Zed" Command Update] - 2024-01-26

- `Open With Zed` command opens the current Finder folder if nothing is selected.

## [New Command] - 2023-12-23

- Add `Open New Window` command

## [Initial Version] - 2023-03-18
