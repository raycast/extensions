/**
 * Type definitions for citation formats
 */
import { ZoteroItem } from "./zoteroItems";

/**
 * Supported citation styles
 */
export type CitationStyle =
  | "apa"
  | "mla"
  | "chicago-note-bibliography"
  | "chicago-author-date"
  | "harvard1"
  | "vancouver"
  | "ieee"
  | string; // Support for custom CSL styles

/**
 * In-text citation format (used within the body of a text)
 */
export interface InTextCitation {
  text: string; // The formatted in-text citation text
  style: CitationStyle; // The style used for formatting
  item: ZoteroItem; // The source item
  location?: string; // Page number or specific location
}

/**
 * Bibliography entry format (used in the references section)
 */
export interface BibliographyEntry {
  text: string; // The formatted bibliography entry
  style: CitationStyle; // The style used for formatting
  item: ZoteroItem; // The source item
  html?: string; // HTML formatted version (with styling)
}

/**
 * Complete bibliography (collection of entries)
 */
export interface Bibliography {
  entries: BibliographyEntry[];
  style: CitationStyle;
  html?: string; // Complete HTML formatted bibliography
}

/**
 * APA specific citation formatting options
 */
export interface APACitationOptions {
  includeAuthorNames?: boolean; // Whether to include author names in citation
  useEtAl?: boolean; // Whether to use "et al." for 3+ authors
  yearOnly?: boolean; // Whether to only include the year
  pageNumbers?: string; // Specific page numbers to cite
  emphasizeTitle?: boolean; // Whether to emphasize the title
}

/**
 * Options for generating citations
 */
export interface CitationGenerationOptions {
  style: CitationStyle;
  locale?: string; // Language/locale for citation
  styleOptions?: APACitationOptions | Record<string, string | number | boolean | null>; // Style-specific options
  linkOut?: boolean; // Whether to include links to sources
  asHtml?: boolean; // Whether to return HTML formatted text
}

export interface Citation {
  id: string;
  title: string;
  authors: string[];
  year: number;
  publicationName: string;
  doi?: string;
  abstract?: string;
  url?: string;
  tags?: string[];
  type: "article" | "book" | "chapter" | "conference" | "other";
}

export interface CitationState {
  isLoading: boolean;
  searchText: string;
  citations: Citation[];
  error?: string;
}

export interface SomethingWithMetadata {
  metadata?: Record<string, string | number | boolean | null>;
}
