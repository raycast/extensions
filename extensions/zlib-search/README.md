# Z-Library Raycast Extension

Search Z-Library and download books directly from Raycast.

## Features

- **Search Books** - Type a title, author, or keyword to search Z-Library in real-time
- **Quick Download** - Press Enter to download any book to your preferred folder
- **Bulk Download** - Select multiple books in the search results and download them all at once
- **Download Queue** - Save books for later with Add to Queue, then review and bulk-download them whenever you're ready, even across Raycast restarts
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

### Bulk Download (select and download now)

1. In Search Books, select a book with **Select** (⌘S) - its row shows a checkmark
2. Repeat for as many books as you want, including across different searches
3. Run **Download Selected** (⌘⇧D) to download all of them, one at a time

### Download Queue (save for later)

1. In Search Books, use **Add to Queue** (⌘B) on any book to save it without downloading
2. Open the **Download Queue** command any time - even after restarting Raycast - to see everything you've saved
3. Download individual books, or run **Download All Queued** (⌘⇧D) to download everything at once
4. Downloaded books stay in the queue marked **Downloaded** until you remove them or clear them with **Clear All Downloaded**

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
