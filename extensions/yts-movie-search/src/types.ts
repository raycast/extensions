export interface Movie {
  id: number;
  url: string;
  imdb_code: string;
  title: string;
  title_english: string;
  title_long: string;
  slug: string;
  year: number;
  rating: number;
  runtime: number;
  genres: string[];
  summary: string;
  description_full: string;
  synopsis: string;
  yt_trailer_code: string;
  language: string;
  mpa_rating: string;
  background_image: string;
  background_image_original: string;
  small_cover_image: string;
  medium_cover_image: string;
  large_cover_image: string;
  state: string;
  torrents?: Torrent[];
  date_uploaded: string;
  date_uploaded_unix: number;
}

export interface Torrent {
  url: string;
  hash: string;
  quality: string;
  type: string;
  is_repack?: string;
  video_codec?: string;
  bit_depth?: string;
  audio_channels?: string;
  seeds: number;
  peers: number;
  size: string;
  size_bytes: number;
  date_uploaded: string;
  date_uploaded_unix: number;
}

export interface SearchResponse {
  status: string;
  status_message: string;
  data: {
    movie_count: number;
    limit: number;
    page_number: number;
    movies: Movie[];
  };
}

export interface MovieDetailsResponse {
  status: string;
  status_message: string;
  data: {
    movie: Movie;
  };
}

export type SortBy = "rating" | "year" | "title" | "download_count" | "like_count" | "date_added";

export type MovieQuality = "all" | "480p" | "720p" | "1080p" | "2160p" | "3D";

export interface BookmarkSourceUpdate {
  type: "initial" | "manual" | "sync";
  at: string;
  note?: string;
}

export interface Bookmark {
  id: number;
  slug: string;
  title: string;
  year?: number;
  coverImage?: string;
  rating?: number;
  runtime?: number;
  imdbCode?: string;
  qualities: string[];
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  sourceUpdate?: BookmarkSourceUpdate;
  hasNewQuality?: boolean;
  lastKnownQualities?: string[];
}

export interface SyncResultSummary {
  updated: number;
  failures: number;
  withQualityChanges: number;
}

export const GENRES = [
  "All",
  "Action",
  "Adventure",
  "Animation",
  "Biography",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Film-Noir",
  "Game-Show",
  "History",
  "Horror",
  "Music",
  "Musical",
  "Mystery",
  "News",
  "Reality-TV",
  "Romance",
  "Sci-Fi",
  "Sport",
  "Talk-Show",
  "Thriller",
  "War",
  "Western",
] as const;

export type Genre = (typeof GENRES)[number];
