# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development**: `npm run dev` - Start Raycast development mode with hot reload
- **Build**: `npm run build` - Build extension for distribution
- **Lint**: `npm run lint` - Check code with ESLint
- **Fix Lint**: `npm run fix-lint` - Auto-fix linting issues
- **Publish**: `npm run publish` - Publish to Raycast Store

## Commit Workflow

**IMPORTANT**: Commit automatically after each thematic or significant change. Do not batch multiple unrelated changes into one commit.

Guidelines:
- **Atomic commits**: Each commit represents one logical unit of work
- **Commit frequently**: After completing a feature, fixing a bug, or making a significant refactor
- **Clear messages**: Use descriptive commit messages that explain the "why" and "what"
- **Include context**: Add relevant details in the commit body when needed
- **Push regularly**: Push commits after completing related work
- **Standard format**: Use the Co-Authored-By footer for Claude-generated commits

Examples of when to commit:
- ✅ After implementing a new feature
- ✅ After fixing a bug
- ✅ After updating documentation
- ✅ After refactoring code
- ✅ After cleaning up temporary files
- ❌ Don't wait to batch unrelated changes together

## Architecture Overview

This is a Raycast extension for searching movies from YTS (YIFY Torrents) and copying magnet links. The extension uses a Cloudflare Worker proxy (`https://yts-proxy-worker.stan-1ca.workers.dev/api/`) to access the YTS API.

### Key Components

- **`search-movies.tsx`**: Main search interface with Grid view, filtering, sorting, and pagination
- **`movie-details.tsx`**: Detailed movie view with torrent options and actions
- **`hooks.ts`**: Custom `useMovieSearch` hook managing search state, debouncing, pagination, and filters
- **`api.ts`**: YTS API integration via Cloudflare Workers proxy
- **`trackers.ts`**: Auto-updating BitTorrent tracker management with weekly refresh from XIU2's CDN
- **`types.ts`**: TypeScript interfaces for Movie, Torrent, API responses
- **`utils.ts`**: Utility functions for magnet link generation, image proxying, quality detection, formatting
- **`constants.ts`**: Configuration values, quality options, display names, fallback trackers

### State Management

The extension uses React hooks for state management with no external libraries:
- Search text with 300ms debouncing
- Pagination with deduplication
- Filtering by genre, quality, and rating
- Auto-sorting (latest for browsing, popular for search)

### User Experience Features

- **Auto-detect selected text**: Uses `getSelectedText()` API for seamless workflow
- **Smart sorting**: Automatically switches between "latest" (browsing) and "popular" (search)
- **Comprehensive keyboard shortcuts**: Cmd+S for sort cycling, Cmd+P for filters
- **Image proxying**: All YTS images proxied through Cloudflare Workers to avoid CORS

### API Integration

- Uses YTS API v2 endpoints: `list_movies.json` and `movie_details.json`
- Cloudflare Workers proxy handles CORS and rate limiting
- Search parameters: query_term, genre, quality, sort_by, minimum_rating, page, limit
- Response includes movie metadata and torrents array with magnet links

### Development Notes

- Extension follows Raycast patterns for Grid, Detail, ActionPanel components
- All external images must be proxied due to CORS restrictions
- Search debouncing prevents excessive API calls
- Pagination implements deduplication to handle overlapping results
- Error handling with Toast notifications for user feedback
- Bookmarks persist locally via `LocalStorage`; future sync support could mirror the same schema to a Cloudflare Worker if we need cross-device storage.
- **Tracker system**: Magnet links use auto-updating tracker lists (7-day cache, fetched from XIU2's CDN, graceful fallback to 17 hardcoded trackers). No user configuration required.
