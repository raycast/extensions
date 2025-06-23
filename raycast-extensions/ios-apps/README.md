# iOS App Search

Search, view, and download iOS apps and screenshots from the App Store.

<img src="./metadata/screenshot-1.png" width="700">
<img src="./metadata/screenshot-2.png" width="700">
<img src="./metadata/screenshot-3.png" width="700">
<img src="./metadata/screenshot-4.png" width="700">
<img src="./metadata/screenshot-5.png" width="700">

## Features

- **Search**: Quickly search for iOS apps by name, developer, or bundle ID
- **Rich App Details**: View comprehensive app information including ratings, screenshots, and metadata
- **Download**: Download IPA files directly to your computer
- **Copy Actions**: Easily copy app metadata like bundle ID, version, and App Store URLs
- **Raycast AI Tools**: Use AI commands to search, get details, and download iOS apps

## How It Works

### App Search and Metadata

The extension uses a dual-source approach to provide comprehensive app information:

1. **ipatool**: Provides the core search functionality and app download capabilities
2. **iTunes API**: Enriches the search results with additional metadata such as:
   - High-resolution app icons and screenshots
   - Ratings and reviews information
   - Detailed app descriptions
   - Release dates and version history
   - Developer information and links

This combination ensures you get the most complete and up-to-date information about iOS apps.

## Requirements

### Homebrew

This extension requires [Homebrew](https://brew.sh), a package manager for macOS. You can install it via the following command:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### ipatool

Once you have Homebrew installed, install [ipatool](https://github.com/majd/ipatool), a command-line tool for interacting with Apple's App Store using this command:

```bash
brew install ipatool
```

By default, the extension looks for `ipatool` at `/opt/homebrew/bin/ipatool`. If your installation is in a different location, you can specify the path in the extension preferences.

### Apple ID Authentication

This extension requires you to authenticate with your Apple ID in order to search and download apps from the App Store. The authentication process is handled securely through `ipatool`:

- Your Apple ID credentials are never stored within the Raycast extension
- Authentication is handled directly by ipatool, which securely stores credentials in your system's keychain

## About App Downloads and Screenshots

Downloaded apps are saved as IPA files to your specified downloads directory (defaults to ~/Downloads). The files are automatically renamed to a user-friendly format: `{App Name} {Version}.ipa`.

Screenshots are downloaded at the highest resolution and saved to the downloads directory.

## Privacy

This extension:

- Does not collect or transmit any personal data
- Only communicates with Apple's servers via the `ipatool` CLI and iTunes API
- Stores no credentials within the extension itself

### Authentication Features

- Two-factor authentication is fully supported
- The extension automatically detects if you're already authenticated

When you first attempt to search or download an app, you'll be prompted to authenticate if needed. After successful authentication, you shouldn't have to re-authenticate for future operations.

---

## About Raycast AI Tools

This extension provides several AI tools that can be used with Raycast AI to enhance your workflow:

### Search iOS Apps

Search for iOS apps on the App Store by name or keyword.

```bash
Search @ios-apps Spotify
```

Options:

- `query`: The search query for finding iOS apps (required)
- `limit`: Maximum number of results to return (optional, default: 10, max: 20)

### Get iOS App Details

Get detailed information about an iOS app by name or search term.

```bash
Get @ios-apps Airbnb
```

Options:

- `query`: The name or search term for the iOS app (required)

### Download iOS App

Download an iOS app directly to your computer.

```bash
Download @ios-apps Instagram
```

Options:

- `query`: The name or search term for the iOS app (required)

The download tool will search for the app, retrieve its details, and download the IPA file to your specified download directory.

## Troubleshooting

### Common Issues

- **Authentication Failures**: If you're having trouble authenticating, try running `ipatool auth login` directly in your terminal
- **Download Errors**: Make sure you have sufficient disk space and permissions to write to your downloads directory. Since downloads aren't currently supported, you can disabled Experimental App Downloads in the extension preferences.
- **Search Not Working**: Verify that `ipatool` is correctly installed and accessible from the path specified in preferences

## Credits

- [ipatool](https://github.com/majd/ipatool) by Majd Alfhaily
- [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html) by Apple
- [Windsurf](https://codeium.com/refer?referral_code=650bebd9a5) by Codeium
- [Claude 3.7](https://claude.ai) by Anthropic
