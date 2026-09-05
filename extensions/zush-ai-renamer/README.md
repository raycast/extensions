# Zush AI Renamer

A Raycast extension that gives the files you selected in Finder clear, searchable names. It reads each
file, asks Gemini for one filename title, shows you every suggestion, and renames only what you approve.

It is the Raycast surface of [Zush](https://zushapp.com): the same job the macOS app and the Google
Drive app do, reduced to a single Raycast command.

## What it does

1. Reads the current Finder selection (up to 50 files). No selection? Pick files in the command itself.
2. Generates one title per file, three requests at a time.
3. Shows the proposed filename next to the current one, with a status for every file.
4. Renames every file that is ready once you confirm, or just the highlighted one with `⌘↵`.

Nothing is renamed until you ask for it, and a file that already owns the target name is never
overwritten. The new name gets a numeric suffix instead.

## Setup

You need your own Google AI Studio API key. Zush does not proxy anything and there is no Zush account.

1. Create a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). The free tier is
   enough for everyday renaming.
2. Run **Rename Files with AI**. Raycast asks for the key before the command opens, and keeps it in its
   own encrypted preference store. Change it any time in the extension preferences.

### Preferences

| Preference             | Default                 | Notes                                                                   |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `Gemini API Key`       | None                    | Required. Stored by Raycast, sent only to `generativelanguage.googleapis.com`. |
| `Model`                | `gemini-3.1-flash-lite` | Any Gemini model that accepts images and PDFs.                          |
| `Filename Style`       | Title Case With Spaces  | Also `kebab-case` and `snake_case`.                                     |
| `Title Language`       | System Language         | Follows this Mac, or pick one of 68 languages.                          |
| `Naming Instructions`  | None                    | Free-form guidance, for example "start invoices with the vendor name".  |

## Supported files

| Kind         | Extensions                                                        | How it is read                                    |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------- |
| Images       | `.jpg` `.jpeg` `.png` `.webp` `.heic` `.heif`                      | Sent to the model as an image, up to 8 MB.        |
| PDF          | `.pdf`                                                            | Sent to the model as a document, up to 4 MB.      |
| Office       | `.docx` `.pptx` `.xlsx`                                           | Text parts are extracted locally, then sent as text. |
| Text markup  | `.txt` `.md` `.csv` `.json` `.xml` `.yaml` `.html` `.srt` and more | First 64 KB is read, capped at 20 000 characters. |
| Source code  | `.ts` `.tsx` `.py` `.swift` `.go` `.rs` and more                  | Same as text.                                     |

Anything else is listed as **Unsupported** and left alone. Folders are never renamed, and neither are
files that exist to hold secrets: `.env` is deliberately not read, so a key or a password cannot end up
in a request.

## Zush for Mac

The extension is complete on its own: no Zush account, no license, no Zush backend. For a file it does
not open, it points at the Mac app and can hand the selection straight to it.

|                                          | Extension | Mac app |
| ---------------------------------------- | --------- | ------- |
| Images, PDF, Office, text, source code   | Yes       | Yes     |
| RAW captures, AVIF, SVG, TIFF            | No        | Yes     |
| Video and audio, with transcripts        | No        | Yes     |
| Folder monitoring, renaming on arrival   | No        | Yes     |
| Finder tags and comments                 | No        | Yes     |
| Reusable naming templates and rules      | No        | Yes     |
| Offline mode with a local model           | No        | Yes     |
| Own API key                              | Required  | Optional |

[zushapp.com](https://zushapp.com?utm_source=raycast&utm_medium=extension&utm_content=readme)

## Privacy

- The API key lives in Raycast's own preference storage and is sent only to Google.
- File bytes are read into memory for one request and never written anywhere else, cached, or logged.
- `.env` files are never read, so secrets kept in them are never sent anywhere.
- The extension has no backend, no telemetry, and no analytics.
- File content is passed to the model as untrusted data, with an explicit instruction to ignore any
  directions found inside it.

Google's handling of the data is governed by the [Gemini API terms](https://ai.google.dev/gemini-api/terms)
for the key you supply.

## Keyboard shortcuts

| Shortcut | Action                        |
| -------- | ----------------------------- |
| `↵`      | Rename every ready file, after a confirmation |
| `⌘↵`     | Rename only the highlighted file              |
| `⌘⇧↵`    | Rename every ready file, from any row          |
| `⌘R`     | Generate another title        |
| `⌘E`     | Edit the title by hand        |
| `⌘⇧C`    | Copy the suggested filename   |
| `⌘Y`     | Show the full names in a side pane |

## Support

**Report Bug** and **Contact Support** sit in the command's action panel, under Feedback. Bugs go to
[this repository's issues](https://github.com/design-ninja/zush-raycast/issues); anything else reaches
[lirik@lirik.pro](mailto:lirik@lirik.pro).

## Development

Requires Node 22+ and the Raycast app.

```bash
npm install && npm run dev
```

```bash
npm run build && npm run lint
```

Use npm, not pnpm or yarn: the Raycast Store builds extensions with npm and matches the installed
versions against `package-lock.json`.

## License

MIT
