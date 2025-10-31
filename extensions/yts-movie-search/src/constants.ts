import { SortBy, MovieQuality } from "./types";

export const CONFIG = {
  // UI Configuration
  ui: {
    searchDebounceMs: 300, // Reduced from 500 for faster feedback
  },

  // API Configuration
  api: {
    baseUrl: "https://yts-proxy-worker.stan-1ca.workers.dev/api",
    defaultSearchLimit: 50,
    timeoutMs: 20000,
  },

  // Quality Configuration
  quality: {
    order: ["2160p", "1080p", "720p", "480p"] as const,
    options: ["All", "2160p", "1080p", "720p", "480p"] as const,
    displayNames: {
      All: "All Qualities",
      "2160p": "4K Ultra HD",
      "1080p": "Full HD",
      "720p": "HD",
      "480p": "SD",
    } as Record<string, string>,
    getAPIValue: (uiQuality: string): MovieQuality => {
      return uiQuality === "All" ? "all" : (uiQuality as MovieQuality);
    },
  },

  // Rating Configuration
  rating: {
    options: ["All", "9+", "8+", "7+", "6+", "5+", "4+", "3+", "2+", "1+"] as const,
    displayNames: {
      All: "All Ratings",
      "9+": "9+ Stars",
      "8+": "8+ Stars",
      "7+": "7+ Stars",
      "6+": "6+ Stars",
      "5+": "5+ Stars",
      "4+": "4+ Stars",
      "3+": "3+ Stars",
      "2+": "2+ Stars",
      "1+": "1+ Stars",
    } as Record<string, string>,
    getAPIValue: (uiRating: string): number => {
      if (uiRating === "All") return 0;
      return parseInt(uiRating.replace("+", ""));
    },
  },

  // Sort Configuration
  sort: {
    options: ["date_added", "download_count", "rating", "year", "title", "like_count"] as SortBy[],
    displayNames: {
      date_added: "Latest",
      download_count: "Popular",
      rating: "Top Rated",
      year: "By Year",
      title: "A-Z",
      like_count: "Most Liked",
    } as Record<SortBy, string>,
  },

  // TMDB Configuration
  tmdb: {
    cacheDurationDays: 90,
    timeoutMs: 10000,
    language: "en-GB",
  },

  // Tracker Configuration
  trackers: {
    // Primary source: XIU2's Cloudflare CDN (88 verified trackers, daily updates)
    sourceUrl: "https://cf.trackerslist.com/best.txt",
    // Alternative: ngosang's best list (20 trackers) - uncomment to use instead
    // sourceUrl: "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_best.txt",
    cacheDurationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    fetchTimeoutMs: 10000, // 10 seconds
    storageKey: "trackers.cache.v1",
  },
} as const;

// Legacy exports for backward compatibility
export const QUALITY_ORDER = CONFIG.quality.order;
export const QUALITY_OPTIONS = CONFIG.quality.options;
export const RATING_OPTIONS = CONFIG.rating.options;
export const QUALITY_DISPLAY_NAMES = CONFIG.quality.displayNames;
export const RATING_DISPLAY_NAMES = CONFIG.rating.displayNames;
export const getAPIQuality = CONFIG.quality.getAPIValue;
export const getAPIRating = CONFIG.rating.getAPIValue;
export const SORT_OPTIONS = CONFIG.sort.options;
export const SORT_DISPLAY_NAMES = CONFIG.sort.displayNames;
export const SEARCH_DEBOUNCE_MS = CONFIG.ui.searchDebounceMs;
export const DEFAULT_SEARCH_LIMIT = CONFIG.api.defaultSearchLimit;
export const BOOKMARK_STORAGE_KEY = "bookmarks.v1";

// Fallback tracker list (used when fetch/cache fails)
export const FALLBACK_TRACKERS = [
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.torrent.eu.org:451/announce",
  "udp://exodus.desync.com:6969/announce",
  "udp://tracker.dler.org:6969/announce",
  "udp://tracker.tiny-vps.com:6969/announce",
  "udp://bt1.archive.org:6969/announce",
  "udp://bt2.archive.org:6969/announce",
  "udp://open.tracker.cl:1337/announce",
  "udp://p4p.arenabg.com:1337/announce",
  "udp://tracker.moeking.me:6969/announce",
  "udp://tracker.0x.tf:6969/announce",
  "udp://tracker.0xmonero.org:1337/announce",
  "udp://tracker.edkj.club:6969/announce",
  "udp://tracker.bittor.xyz:6969/announce",
  "udp://retracker.lanta-net.ru:2710/announce",
  "udp://tracker.tambovnet.org:6969/announce",
] as const;
