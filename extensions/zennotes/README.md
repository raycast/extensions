# ZenNotes for Raycast

Search notes from Raycast and open them in ZenNotes or a floating window.

## Requirements

- macOS
- Raycast
- ZenNotes desktop app
- ZenNotes CLI installed as `zen`

Install the CLI from ZenNotes Settings -> CLI, then verify it:

```sh
zen list
```

## Local Development

```sh
npm install
npm run dev
```

Run the Raycast command named "Search Notes". Selecting a result opens:

```text
zennotes://open?path=<vault-relative-note-path>
```

The desktop app handles that URL and opens the note in an existing tab or a new tab.

The "Open in Floating Window" action opens:

```text
zennotes://open-window?path=<vault-relative-note-path>
```

The command also includes:

- Folder and tag filters in the search bar dropdown
- Archive and unarchive actions
- Move to Trash with confirmation
- Reveal in Finder, Copy Note Path, and Copy Wikilink actions

Quick note creation is intentionally not part of this extension. Fast capture stays inside ZenNotes and the `zen` CLI; Raycast focuses on search, open, and note lifecycle actions.
