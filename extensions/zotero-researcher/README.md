# Zotero Researcher for Raycast

A Raycast extension that connects to your local Zotero database, making it easy to access your research library without leaving your workflow.

## Features

- 📚 Browse your Zotero collections and items directly from Raycast
- 🔍 Search across your entire Zotero library
- 📋 Copy citations in various formats with a single click
- 💻 Works with your local Zotero database - no API key required

## Requirements

- [Raycast](https://raycast.com/) installed
- [Zotero](https://www.zotero.org/download/) desktop application installed
- macOS 10.15 or later

## Installation

### From Raycast Store

1. Open Raycast
2. Search for "Store"
3. Search for "Zotero Researcher"
4. Click "Install"

### Manual Installation (Development)

1. Clone this repository
2. Install dependencies: `npm install`
3. Generate the command icon: `npm run generate-icons`
4. Build the extension: `npm run build`
5. Open Raycast and run the "Import Extension" command
6. Select the `dist` directory from this project

## Usage

1. Open Raycast (Option+Space)
2. Type "Zotero" to find the extension
3. Press Enter to open the extension
4. Browse your Zotero collections and items
5. Use the available actions to copy citations or view details

## Privacy

This extension only connects to your local Zotero database and does not send any data to external servers. Your research library remains private and secure on your own computer.

## Troubleshooting

- **Extension doesn't show my Zotero library**: Make sure Zotero is installed and has been run at least once to create the database.
- **Missing collections or items**: The extension reads your Zotero SQLite database directly. Make sure Zotero is closed or not actively writing to the database when using the extension.
- **Performance issues**: If you have a very large Zotero library, initial loading might take a moment.

## Development

This extension is built with:
- [Raycast API](https://developers.raycast.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [SQLite](https://www.sqlite.org/) for database access

To contribute:
1. Fork the repository
2. Make your changes
3. Run `npm run lint` and `npm run format` to ensure code quality
4. Submit a pull request

## License

MIT

## Credits

- Zotero is a trademark of the [Corporation for Digital Scholarship](https://digitalscholarship.org/)
- Icon created using the Raycast icon guidelines 