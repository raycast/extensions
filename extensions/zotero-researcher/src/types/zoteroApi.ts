/**
 * Type definitions for Zotero API responses
 */
import { ZoteroItem } from "./zoteroItems";

/**
 * Pagination links returned in Zotero API responses
 */
export interface ZoteroApiLinks {
  self: {
    href: string;
    type: string;
  };
  first?: {
    href: string;
    type: string;
  };
  prev?: {
    href: string;
    type: string;
  };
  next?: {
    href: string;
    type: string;
  };
  last?: {
    href: string;
    type: string;
  };
  alternate?: {
    href: string;
    type: string;
  };
  up?: {
    href: string;
    type: string;
  };
}

/**
 * Metadata included in Zotero API responses
 */
export interface ZoteroApiMeta {
  totalResults?: number;
  numResults?: number;
  start?: number;
  apiVersion?: number;
  [key: string]: number | string | boolean | undefined;
}

/**
 * Base structure for all Zotero API responses
 */
export interface ZoteroApiResponseBase {
  links?: ZoteroApiLinks;
  meta?: ZoteroApiMeta;
  version?: number;
}

/**
 * Response structure for a list of items
 */
export interface ZoteroItemsResponse {
  data: ZoteroItem[];
  links?: ZoteroApiLinks;
  meta?: {
    numResults?: number;
    [key: string]: number | string | boolean | undefined;
  };
}

/**
 * Response structure for a single item
 */
export interface ZoteroItemResponse extends ZoteroApiResponseBase {
  data: ZoteroItem;
}

/**
 * Response structure for a list of collections
 */
export interface ZoteroCollectionsResponse extends ZoteroApiResponseBase {
  data: ZoteroCollection[];
}

/**
 * Collection data structure
 */
export interface ZoteroCollection {
  key: string;
  version: number;
  name: string;
  parentCollection?: string;
  relations?: Record<string, string[]>;
  dateAdded: string;
  dateModified: string;
}

/**
 * Search parameters for Zotero API
 */
export interface ZoteroSearchParams {
  q?: string; // General search query
  tag?: string | string[]; // Filter by tag(s)
  collection?: string; // Filter by collection key
  itemType?: string; // Filter by item type
  qmode?: "titleCreatorYear" | "everything"; // Search mode
  sort?: string; // Sort order
  direction?: "asc" | "desc"; // Sort direction
  limit?: number; // Number of results to return
  start?: number; // Starting position for results
  include?: ("data" | "bib" | "citation" | "meta" | "coins" | "bibtex" | "biblatex" | "ris")[];
  style?: string; // Citation style
  linkwrap?: 0 | 1; // Whether to wrap bibliography in HTML links
}

/**
 * API Error response
 */
export interface ZoteroApiError {
  error: {
    code: number;
    message: string;
  };
}

/**
 * Options for Zotero API requests
 */
export interface ZoteroApiOptions {
  params?: Record<string, string | number | boolean>;
}
