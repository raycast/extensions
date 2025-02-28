# Zen Changelog

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
