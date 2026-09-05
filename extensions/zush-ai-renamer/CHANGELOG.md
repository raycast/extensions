# Zush AI Renamer Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Rename the Finder selection with AI-generated filename titles, reviewed before anything is written.
- The whole batch is the default action, since the selection is the request; a single file is one
  modifier away.
- Support for images, PDFs, Office Open XML documents, text markup and source files.
- Bring-your-own Gemini API key, held in Raycast's own preference store. No backend and no telemetry.
- Progress in a Raycast toast while titles are generated and while files are renamed.
- Report Bug and Contact Support in the action panel, with the Raycast version prefilled in the report.
- A rejected API key stops the batch at once, rather than spending a request per file on the same
  answer, and every file it did not reach says so on its own row.
- A rate limit or a passing Google outage is waited out and tried again during a batch, so a failure
  that resolves itself does not turn into a row to redo by hand.
- Files that exist to hold secrets, such as `.env`, are left unread; their contents never leave the Mac.
- Per-file regeneration, manual title editing and a copy action.
- Read a title the row is too narrow for: hover its status tag, or open the side pane with the full
  names and, for a picture, the picture itself.
- Title Case, kebab-case and snake_case filename styles, free-form naming instructions, and a title
  language picked from the 68 the Zush macOS app supports, defaulting to this Mac's own language.
- A file only the Zush Desktop app can rename says so on its row and leads with the one action that
  gets it renamed: the hand-off if the app is installed, the download if it is not.
