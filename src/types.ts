export type Ecosystem = "homebrew" | "winget";

// Base search result interface
export interface SearchResult {
  id: string;
  ecosystem: Ecosystem;
  slug: string;
  name: string;
  publisher: string | null;
  version: string;
  categories: string[];
  updated_at?: number;
}

// Extended result with optional fields for different API response formats
export interface ExtendedSearchResult extends SearchResult {
  package_id?: string;
  homepage?: string;
  hb_type?: "cask" | "formula";
  content?: {
    name?: string;
    ecosystem?: Ecosystem;
    publisher?: string;
  };
  metadata?: {
    version?: string;
    slug?: string;
    homepage?: string;
    hb_type?: "cask" | "formula";
    id?: string;
  };
}

export interface SearchResponse {
  total: number;
  page: number;
  limit: number;
  count: number;
  results: SearchResult[];
}
