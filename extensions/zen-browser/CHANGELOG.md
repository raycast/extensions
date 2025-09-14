# Zen Changelog

## [Added Open Workspace Command] - 2025-09-14

## [Fix New Tab and History Tab] - 2025-06-11

- Fix new tab and history tab commands, by adding a delay to the script to ensure the URL bar is focused.

## [✨ AI Enhancements] - 2025-05-15

AI Tools to:

- Open New Tab
- Search History

## [Update brew install command] - 2025-04-24

- Update the brew install command from Firefox to Zen Browser.

## [Add Browser Default Search Engine] - 2025-04-22

- Added the ability to use the user's default browser search engine set within Zen as the search engine.
- Changed the default search engine to the Browser Default.

## [Changing the name of app called] - 2025-03-21

- Changed name of app being called from "Zen Browser" to "Zen"

## [Add custom new tab shortcut] - 2025-03-10

- Add ability to set a custom new tab shortcut.
- Default is `command t`.
- Quicker url entry with copy-paste command.

## [Fix Default Profile Detection] - 2025-02-09

- Made the default profile detection more resilient by expanding the profile
  directory search logic.
- Changed the URL for the Zen Browser logo.

## [Fix New Tab] - 2025-01-11

- Fix new tab command, by removing unnecessary app check.

## [Update Logo] - 2024-12-11

- Updated to latest logo since rebrand.

## [Fix Bookmark Duplicates Issue] - 2024-11-21

- Fix duplicate entries in bookmark search results. Previously, bookmarks would show up multiple times if they had tags. Now each bookmark appears only once regardless of how many tags it has.

## [Fix Bookmark Search] - 2024-11-18

- Fix Bookmark search by using the SQlite DB instead of bookmarkbackups directory.

## [Initial Version] - 2024-10-02

- Copied Firefox extension and rename all necessary parts.
