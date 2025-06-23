// src/types.ts - Type definitions for the extension
export interface AppDetails {
  artworkUrl60: string | undefined;
  id: string;
  bundleId: string;
  name: string;
  description: string;
  iconUrl: string;
  sellerName: string;
  version: string;
  price: string;
  genres: string[];
  size: string;
  contentRating: string;
  // iTunes API additional fields
  artworkUrl512?: string;
  averageUserRating?: number;
  averageUserRatingForCurrentVersion?: number;
  userRatingCount?: number;
  userRatingCountForCurrentVersion?: number;
  releaseDate?: string;
  currentVersionReleaseDate?: string;
  trackViewUrl?: string;
  artistViewUrl?: string;
  screenshotUrls?: string[];
  ipadScreenshotUrls?: string[];
  appletvScreenshotUrls?: string[];
}

export interface VersionHistoryItem {
  version: string;
  releaseDate: string;
  releaseNotes: string;
}

export interface ExtensionPreferences {
  appleId: string;
  password: string;
  downloadPath?: string;
  homebrewPath?: string;
  ipatoolPath?: string;
  enableAppDownloads?: boolean;
}

export interface ITunesResponse {
  resultCount: number;
  results: ITunesResult[];
}

export interface ITunesResult {
  artistId: number;
  artistName: string;
  artistViewUrl: string;
  artworkUrl60: string;
  artworkUrl100: string;
  artworkUrl512: string;
  averageUserRating: number;
  averageUserRatingForCurrentVersion: number;
  bundleId: string;
  contentAdvisoryRating: string;
  currency: string;
  currentVersionReleaseDate: string;
  description: string;
  features: string[];
  fileSizeBytes: string;
  formattedPrice: string;
  genreIds: string[];
  genres: string[];
  ipadScreenshotUrls: string[];
  isGameCenterEnabled: boolean;
  kind: string;
  languageCodesISO2A: string[];
  minimumOsVersion: string;
  price: number;
  primaryGenreName: string;
  releaseDate: string;
  releaseNotes: string;
  screenshotUrls: string[];
  sellerName: string;
  sellerUrl: string;
  trackCensoredName: string;
  trackContentRating: string;
  trackId: number;
  trackName: string;
  trackViewUrl: string;
  userRatingCount: number;
  userRatingCountForCurrentVersion: number;
  version: string;
  wrapperType: string;
}

// Interface for ipatool search results
export interface IpaToolSearchApp {
  id: number;
  bundleID: string;
  name: string;
  version: string;
  price: number;
  developer: string;
}

export interface IpaToolSearchResponse {
  count: number;
  apps: IpaToolSearchApp[];
}
