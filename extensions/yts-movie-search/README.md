# YTS Movie Search - Raycast Extension

Search for movies from YTS and easily copy magnet links with different quality options.

## Features

- 🔍 Search movies from the YTS database
- 🪄 Auto-detects selected text—highlight a title anywhere and run the command
- 📊 View movie details including rating, runtime, genres, and torrents
- 🎬 See available quality options (720p, 1080p, 2160p/4K, 3D)
- 🔗 Copy magnet links with one click (auto-updating tracker lists for better connectivity)
- 📈 View seed/peer information
- 🎯 Quick access to related external resources
- ⌨️ Comprehensive keyboard shortcuts for navigation
- 🔖 Bookmark movies locally to revisit them later or monitor new quality releases
- 🎭 Automatic synopsis fallback to TMDB when YTS data is missing (optional TMDB API token)
- 🔄 Auto-refreshing BitTorrent trackers weekly for optimal torrent performance

## Installation

1. Run the setup script: `./setup.sh`
2. The extension will be automatically installed and opened in Raycast

## Usage

1. **Manual Search**: Open Raycast (⌘ + Space), type "Search Movies", enter a movie title.
2. **Selected Text Search**: Highlight any movie title, then run the command—text is auto-filled.
3. Browse results with quality indicators, ratings, and bookmarks.
4. Press Enter to view details and available torrents.
5. Select a quality and copy the magnet link or open external resources.
6. Use **Cmd+B** to bookmark from the grid, **Cmd+Shift+B** inside the detail pane.
7. Use **Cmd+S** to cycle sort options, **Cmd+P** to open filters, or switch to the Bookmarked view via the dropdown.

## Bookmarks

- **Save a movie**: Press **Cmd+B** on any grid item or use the “Bookmark Movie” action in the detail view.
- **View saved titles**: Switch the search bar dropdown to “Bookmarked Movies.” The list uses local storage, so it works offline and paginates automatically.
- **Refresh metadata**: Press **Cmd+Shift+R** (or the refresh action) in the bookmarked view to fetch the latest torrents; new qualities show as `✨ New Quality Available • 📍`.
- **Clear the badge**: Use the “Mark Quality Update as Seen” action on the grid or detail view once you’ve noted the upgrade.
- **Persistence**: Bookmarks survive Raycast restarts; snapshots include the last sync timestamp and previously seen qualities.

### QA Checklist
- Bookmark from the grid and confirm the `📍` (or `✨`) subtitle appears.
- Open the detail view and ensure bookmark status stays in sync.
- Switch to the Bookmarked view and verify pagination plus filters behave as expected.
- Remove a bookmark from both the grid and detail contexts.
- Restart Raycast and confirm bookmarked items persist.

## API Proxy

This extension uses a Cloudflare Worker proxy to access the YTS API:
- Proxy URL: `https://yts-proxy-worker.stan-1ca.workers.dev/api/`

## Auto-Updating Tracker Lists

Magnet links automatically include fresh, verified BitTorrent trackers for optimal connectivity:

- **Source**: XIU2's Cloudflare CDN tracker list (~88 verified trackers, updated daily)
- **Refresh**: Weekly background checks (7-day cache)
- **Fallback**: 17 hardcoded reliable trackers if network unavailable
- **Configuration**: None required - works automatically behind the scenes

This ensures your torrents connect to the maximum number of healthy peers and seeders.

## TMDB Integration (Optional)

Many movies on YTS lack synopsis/description data. To enhance your experience:

1. **Get a TMDB API Token**:
   - Create a free account at https://www.themoviedb.org
   - Go to Settings → API
   - Request an API key (select "Developer" option)
   - Copy your "API Read Access Token" (starts with `eyJhbGci...`)

2. **Configure the extension**:
   - Open Raycast preferences
   - Find "Yts Movie Search" extension settings
   - Paste token in "TMDB API Token (Optional)" field

3. **How it works**:
   - When you open movie details without a synopsis, the extension automatically fetches the overview from TMDB
   - Results are cached for 90 days for instant loading
   - Works seamlessly in the background with no loading indicators
   - If no token is configured, the extension continues to work normally without TMDB data

## Development

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build extension
npm run build

# Publish to Raycast Store
npm run publish
```

### Development Guidelines & References

#### Raycast API Documentation
- **Main Documentation**: https://developers.raycast.com/
- **API Reference**: https://developers.raycast.com/api-reference
- **Component Guide**: https://developers.raycast.com/api-reference/user-interface
- **Examples**: https://github.com/raycast/extensions/tree/main/examples

#### YTS API Documentation
- **Official API Docs**: https://yts.mx/api
- **Base URL**: https://yts.mx/api/v2/ (proxied via Cloudflare Workers)
- **Main Endpoints Used**:
  - `list_movies.json` - Search and list movies with pagination
  - `movie_details.json` - Get detailed movie information
- **Key Parameters**:
  - `query_term`: Search query string
  - `genre`: Filter by genre (All, Action, Comedy, etc.)
  - `quality`: Filter by quality (All, 720p, 1080p, 2160p, 3D)
  - `sort_by`: Sort options (title, year, rating, download_count, like_count, date_added)
  - `limit`: Number of results per page (default: 20, max: 50)
  - `page`: Page number for pagination
- **Response Format**: JSON with `status`, `data`, and movie objects containing torrents array
- **Rate Limiting**: No official limits documented, but we use debouncing (300ms) for search

#### Key Raycast Components Used
- **Grid**: For movie listings with posters and metadata
- **Detail**: For movie details view with markdown content
- **Action/ActionPanel**: For keyboard shortcuts and user actions
- **Dropdown**: For filtering, sorting, and switching between views (searchBarAccessory)
- **Toast**: For user feedback and error messages
- **LocalStorage**: Persists bookmarks between Raycast launches

#### Important Raycast Patterns
1. **Keyboard Shortcuts**: Use `shortcut={{ modifiers: ["cmd"], key: "s" }}` format
2. **Search Bar Accessories**: Dropdowns for filtering/sorting attached to search bar (accessible via Cmd+P)
3. **Navigation**: Use `useNavigation()` hook for push/pop navigation
4. **Error Handling**: Always show meaningful error messages via Toast
5. **Auto-detect Selected Text**: Use `getSelectedText()` API for seamless UX

#### Current Keyboard Shortcuts
- **Cmd+S**: Cycle sort options in movie lists
- **Cmd+P**: Access filter dropdown (built-in Raycast functionality)
- **Cmd+L**: Search movie on Plex (in movie details)
- **Cmd+R**: Open on Rotten Tomatoes
- **Cmd+T**: Watch trailer on YouTube
- **Cmd+C**: Copy movie URL
- **Cmd+Y**: Open on YTS
- **Cmd+I**: Open on IMDb

#### Architecture Notes
- `hooks.ts`: Custom useMovieSearch hook with pagination, filtering, debouncing
- `utils.ts`: Utility functions for URLs, formatting, image proxying
- `constants.ts`: Configuration values, quality options, display names
- `api.ts`: YTS API integration with Cloudflare Workers proxy
- `types.ts`: TypeScript interfaces for Movie, Genre, SortBy, etc.

#### Common Raycast Development Gotchas
1. **Reserved Shortcuts**: Cmd+P (searchBarAccessory), Cmd+K (search/command palette) are reserved by Raycast
2. **Dropdown Focus**: Use Cmd+P to access searchBarAccessory dropdowns - it's built-in!
3. **Image Loading**: Use proxied URLs for external images to avoid CORS issues
4. **Pagination**: Implement with `pagination` prop on Grid/List components
5. **State Management**: Use React hooks (useState, useEffect) - no external state libs needed

## License

MIT
