# YouTube Music - Raycast Extension

Browse and search YouTube Music directly from Raycast on Windows.

## Features

- 🎵 **Search Songs** - Find any song on YouTube Music with duration and artist info
- 🎤 **Search Artists** - Discover artists sorted by popularity with detailed information views
- 📜 **Search Playlists** - Browse playlists with song counts
- 💿 **Search Albums** - Find albums sorted by popularity with full tracklist views
- 📊 **Smart Sorting** - Artists sorted by subscribers, albums by view counts
- 🔍 **Detail Views** - Deep dive into artist bios and album tracklists

## Setup

### 1. Get a YouTube Data API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **YouTube Data API v3**:
   - Go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key (you can restrict it to YouTube Data API v3 for security)

### 2. Install Dependencies

```powershell
npm install
```

### 3. Configure the Extension

When you first run any command, Raycast will prompt you to enter your YouTube API key. You can also set it later in Raycast preferences:

1. Open Raycast
2. Go to Extensions > YouTube Music > Preferences
3. Enter your API key

### 4. Development

```powershell
npm run dev
```

## Commands

### Search Song
Search for songs on YouTube Music. Results show:
- Song title
- Artist/channel name
- Duration
- Thumbnail

**Actions:**
- `Enter` - Play in YouTube Music (opens in browser)
- `Cmd+C` - Copy URL
- `Cmd+Shift+C` - Copy title

### Search Artist
Search for artists and channels. Results show:
- Artist name
- Subscriber count
- Profile picture

**Results are sorted by popularity (most subscribers first)**

**Actions:**
- `Enter` - Show detailed artist information
- Open artist page in YouTube Music
- `Cmd+C` - Copy URL
- `Cmd+Shift+C` - Copy name

**Artist Details View:**
- View artist biography
- See subscriber and video counts
- Direct link to YouTube Music channel

### Search Playlist
Search for playlists. Results show:
- Playlist title
- Creator
- Number of songs
- Cover image

**Actions:**
- `Enter` - Open playlist in YouTube Music
- `Cmd+C` - Copy URL
- `Cmd+Shift+C` - Copy title

### Search Album
Search for albums. Results show:
- Album title
- Artist
- Cover art
- Number of songs

**Results are sorted by popularity (most played albums first)**

**Actions:**
- `Enter` - Show all songs in the album
- Open album in YouTube Music
- `Cmd+C` - Copy URL
- `Cmd+Shift+C` - Copy title

**Album Details View:**
- View complete tracklist with durations
- Play individual songs
- See album metadata

## Usage Tips

- All searches are debounced (500ms delay) to avoid excessive API calls
- Results are limited to 25 items per search
- The extension uses the YouTube Music web player URLs for compatibility
- API quota limits apply (10,000 units per day by default)

## API Quota Information

The YouTube Data API v3 has a daily quota limit. Each search operation costs:
- Search request: 100 units
- Additional details (videos/channels/playlists): 1 unit per item

With the default 10,000 units/day quota, you can perform approximately 50-100 searches per day depending on result counts.

## Future Features

- 💾 Save favorite songs, artists, and playlists locally
- ▶️ Direct playback integration (if feasible)
- 🔄 Recent searches history
- ⭐ Quick access to saved items
- 📊 View listening statistics

## Development

```powershell
# Run in development mode
npm run dev

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint

# Build for production
npm run build
```

## Troubleshooting

### "Search Failed" Error
- Check that your API key is correct
- Ensure YouTube Data API v3 is enabled in Google Cloud Console
- Verify you haven't exceeded your daily quota

### No Results
- Try different search terms
- Some content may not be available via the API
- Check your internet connection

## License

MIT

## Author

darsh_suhas_ambade

