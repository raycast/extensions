# Zoxide Plus Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Add `Jump to Folder` command: live search of your zoxide index, ranked by frecency score
- Match on folder names rather than full paths, so short queries hit the folder you actually want
- Open results in Finder, a configurable terminal, or a configurable editor
- Reveal in Finder, copy path, and boost score (`⌘B`) actions
- Add `Add Path to Zoxide` command: adds the selected folder in Finder (or the containing folder of a selected file), and falls back to a folder picker when Finder has no selection
- Terminal and editor app pickers exposed as extension preferences
