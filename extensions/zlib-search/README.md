# Z-Library Raycast Extension

Search Z-Library and download books directly from Raycast.

## Features

- **Search Books** - Type a title, author, or keyword to search Z-Library in real-time
- **Quick Download** - Press Enter to download any book to your preferred folder
- **Book Details** - View authors, year, format, size, and rating for each result
- **Browse Online** - Open books in your browser to read previews or get more info
- **Copy Book ID** - Quickly copy book IDs for command-line use

## Requirements

- **zlib CLI** installed via Homebrew:
  ```bash
  brew install heartleo/tap/zlib
  ```
- An active Z-Library login (run `zlib login` in Terminal)

## Setup

1. Install the extension from Raycast Store
2. Configure preferences (optional):
   - **zlib Binary Path** - Path to zlib executable (default: `/opt/homebrew/bin/zlib`)
   - **Download Directory** - Where to save books (default: `~/Downloads`)
   - **Z-Library Domain Override** - Set this only if your session uses a blocked domain (see `zlib doctor --eapi`)

## Usage

1. Open Raycast (⌘+Space)
2. Type "Search Books"
3. Enter a search query (title, author, ISBN, etc.)
4. Press ⏎ to download, or use other actions:
   - **Open in Browser** - Visit the book's Z-Library page
   - **Copy Book ID** - Copy the book's identifier

## Domain Issues?

If you see "failed to fetch book" errors, your saved Z-Library session may be using a blocked domain. Run this in Terminal:

```bash
zlib doctor --eapi
```

Look for domains marked "healthy", then set one in the extension's **Z-Library Domain Override** preference (⌘+K).

## License

MIT

## Links

- [zlib GitHub](https://github.com/heartleo/zlib)
- [Z-Library](https://z-library.ec/)
