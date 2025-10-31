# Changelog

All notable changes to the YTS Raycast Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **TMDB Synopsis Fallback**: Automatically fetch missing movie descriptions from The Movie Database (TMDB) API
  - Optional TMDB API token preference (password field)
  - 90-day LocalStorage caching for fast loading
  - Silent fallback - works seamlessly with or without token
  - UK English (en-GB) content
  - Only fetches when movie details opened (not in listings)
- **Auto-Updating Tracker Lists**: Magnet links now use fresh, verified BitTorrent trackers
  - Automatically fetches from XIU2's Cloudflare CDN tracker list (88 verified trackers)
  - Weekly background refresh (7-day cache with automatic updates)
  - Zero user configuration - works completely behind the scenes
  - Graceful fallback to 17 hardcoded trackers if network unavailable
  - Improves torrent connectivity and peer discovery

### Fixed
- Persistent "No Movies Found" toast notification now auto-dismisses after clearing filters or finding new results
- Toast style changed from Animated to Failure for better UX (~3 second auto-dismiss)
- Improved error handling for empty search results - now shows friendly "No Movies Found" message instead of API error
- API validation now correctly handles `null` movies response from YTS API

## [1.1.0] - 2025-10-22

### Added
- Bookmark movies locally for quick access and monitoring
- Automatic quality tracking - get notified when new torrent qualities are released
- Dedicated bookmarked movies view with pagination and search
- Manual and automatic bookmark refresh (6-hour threshold)
- Visual indicators: 📍 for bookmarked movies, ✨ for new quality releases
- Quality update acknowledgment system - mark new qualities as seen
- Comprehensive test suite for bookmark functionality

### Changed
- Increased API timeout from 5s to 10s for more reliable requests

### Technical
- Implemented singleton bookmark cache with listener pattern for real-time sync
- Queued persistence layer to prevent race conditions
- Batch API refresh (5 concurrent requests) with failure handling

## [1.0.0] - Initial Release

### Features

- **Search & Discovery**
  - Search movies from YTS database with 300ms debouncing
  - Auto-detect selected text for seamless workflow
  - Multiple sort options: Download Count, Rating, Year, Title, Peers, Like Count, Date Added
  - Comprehensive genre filtering (26 genres)
  - Quality filtering: 720p, 1080p, 2160p/4K, 3D
  - Rating filter
  - Pagination with load more

- **Movie Details**
  - View detailed information: rating, runtime, genres, synopsis
  - See available torrent quality options with seed/peer counts
  - Quality indicators with color coding (4K=purple, 3D=orange, 1080p=blue)

- **Actions**
  - Copy magnet links with one click (Cmd+M)
  - Quick access to external resources:
    - IMDb (Cmd+I)
    - Rotten Tomatoes (Cmd+R)
    - YTS page (Cmd+Y)
    - YouTube trailer (Cmd+T)
  - Search on Plex (Cmd+L)

- **Keyboard Shortcuts**
  - Cmd+S: Cycle sort options
  - Cmd+P: Access filter dropdown
  - Cmd+Shift+B: Bookmark/unbookmark movie
  - Cmd+Shift+R: Refresh bookmarks

- **Performance**
  - Image proxying through Cloudflare Workers (avoids CORS)
  - Smart sorting: auto-switches to "popular" during search, "latest" when browsing
  - Efficient API usage with debouncing and pagination
