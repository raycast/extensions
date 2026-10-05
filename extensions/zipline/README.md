<div align="center">

# Zipline

</div>

<div align="center">
  <a href="https://github.com/treyg">
    <img src="https://img.shields.io/github/followers/treyg?label=Follow%20treyg&style=social" alt="Follow @treyg">
  </a>
  <a href="https://www.raycast.com/treyg/zipline">
    <img src="https://img.shields.io/badge/Raycast-Store-red.svg" alt="Zipline on Raycast store.">
  </a>

  <p style="margin-top: 20px;">Manage your self-hosted Zipline uploads directly from Raycast. Browse, upload, and share files and text from your clipboard.</p>

</div>

## Features

- **Instant clipboard upload** - Upload clipboard text with one command
- **File upload with options** - Password protection, expiration dates, custom formats
- **Browse & search uploads** - View all your files with pagination and filtering
- **Recent uploads** - Quick access to your latest uploads
- **File management** - Copy URLs, toggle favorites, delete files
- **Rich metadata** - File types, sizes, upload dates, view counts

## Commands

### Upload Clipboard (Instant)

- Instantly upload clipboard text to Zipline
- Automatic URL copying to clipboard
- No forms or dialogs - just pure speed

### Upload File

- Upload single or multiple files with full options
- Filename formats: Random, Date, UUID, Gfycat-style, Original name
- Optional password protection and expiration dates
- Automatic URL copying to clipboard

### Browse Uploads

- Search and filter through all your uploads
- Pagination support for large collections
- Copy URLs, toggle favorites, and delete files

### Recent Uploads

- Quick access to your 10 most recent uploads
- Relative time display (e.g., "2 hours ago")
- Same management actions as Browse Uploads

## Actions

- Copy file URL (`↵`)
- Toggle favorite (`⌘` + `F`)
- Delete file (`⌘` + `⇧` + `Delete`)
- Refresh view (`⌘` + `R`)
- Navigate pages (`⌘` + `←/→`)

## Preferences

- **Zipline URL**: Your Zipline instance URL (e.g., `https://zipline.example.com`)
- **API Token**: Your Zipline API token (found in your user settings)
- **Page Size**: Number of uploads to display per page (default: 20)

## Setup

1. Install the extension from the Raycast store
2. Open Raycast preferences and configure the Zipline extension:
   - Enter your Zipline instance URL
   - Add your API token from your Zipline user settings
3. Start uploading and managing files instantly

## Requirements

- Self-hosted Zipline instance (v3 or v4)
- Valid Zipline API token
- Raycast 1.26.0 or higher
