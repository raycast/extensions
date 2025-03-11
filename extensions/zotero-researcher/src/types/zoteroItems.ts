/**
 * Type definitions for Zotero items
 */

/**
 * Zotero API response item structure
 */
export interface ZoteroItem {
  key: string;
  version: number;
  library: {
    type: string;
    id: number;
    name: string;
    links: Record<string, { href: string }>;
  };
  links: Record<string, { href: string }>;
  meta: {
    creatorSummary?: string;
    parsedDate?: string;
    numChildren?: number;
  };
  data: ZoteroItemData;
}

/**
 * Common properties shared by all Zotero item data
 */
export interface ZoteroItemData {
  key?: string;
  version?: number;
  itemType: string;
  title?: string;
  creators?: ZoteroCreator[];
  abstractNote?: string;
  date?: string;
  dateAdded?: string;
  dateModified?: string;
  tags?: Array<{ tag: string; type?: number }>;
  collections?: string[];
  relations?: Record<string, string[]>;

  // Journal article fields
  publicationTitle?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  journalAbbreviation?: string;
  DOI?: string;
  ISSN?: string;

  // Book fields
  publisher?: string;
  place?: string;
  ISBN?: string;
  numPages?: string;

  // Common fields
  url?: string;
  accessDate?: string;
  language?: string;
  rights?: string;
  extra?: string;

  // File attachment fields
  contentType?: string;
  filename?: string;
  md5?: string;
  mtime?: number;
}

/**
 * Creator person for Zotero items
 */
export interface ZoteroCreator {
  creatorType: string;
  firstName?: string;
  lastName?: string;
  name?: string; // Used for single-field names
}

/**
 * Common properties shared by all Zotero items
 */
export interface ZoteroItemBase {
  key: string; // Unique identifier in library
  version: number; // Version of the item
  itemType: string; // Type of item (e.g., "journalArticle", "book")
  tags: Array<{ tag: string; type?: number }>;
  collections: string[]; // Array of collection keys
  relations: Record<string, string[]>;
  dateAdded: string; // ISO 8601 format
  dateModified: string; // ISO 8601 format
  creators: ZoteroCreator[];
}

/**
 * Properties specific to a journal article
 */
export interface ZoteroJournalArticle extends ZoteroItemBase {
  itemType: "journalArticle";
  title: string;
  abstractNote?: string;
  publicationTitle: string; // Journal name
  volume?: string;
  issue?: string;
  pages?: string;
  date?: string; // Publication date
  series?: string;
  seriesTitle?: string;
  seriesText?: string;
  journalAbbreviation?: string;
  language?: string;
  DOI?: string;
  ISSN?: string;
  shortTitle?: string;
  url?: string;
  accessDate?: string;
  archive?: string;
  archiveLocation?: string;
  libraryCatalog?: string;
  callNumber?: string;
  rights?: string;
  extra?: string;
}

/**
 * Properties specific to a book
 */
export interface ZoteroBook extends ZoteroItemBase {
  itemType: "book";
  title: string;
  abstractNote?: string;
  series?: string;
  seriesNumber?: string;
  volume?: string;
  numberOfVolumes?: string;
  edition?: string;
  place?: string;
  publisher?: string;
  date?: string;
  numPages?: string;
  language?: string;
  ISBN?: string;
  shortTitle?: string;
  url?: string;
  accessDate?: string;
  archive?: string;
  archiveLocation?: string;
  libraryCatalog?: string;
  callNumber?: string;
  rights?: string;
  extra?: string;
}

/**
 * Properties specific to a book chapter
 */
export interface ZoteroBookChapter extends ZoteroItemBase {
  itemType: "bookSection";
  title: string; // Chapter title
  bookTitle: string; // Book title
  abstractNote?: string;
  series?: string;
  seriesNumber?: string;
  volume?: string;
  numberOfVolumes?: string;
  edition?: string;
  place?: string;
  publisher?: string;
  date?: string;
  pages?: string;
  language?: string;
  ISBN?: string;
  shortTitle?: string;
  url?: string;
  accessDate?: string;
  archive?: string;
  archiveLocation?: string;
  libraryCatalog?: string;
  callNumber?: string;
  rights?: string;
  extra?: string;
}

/**
 * Properties specific to a conference paper
 */
export interface ZoteroConferencePaper extends ZoteroItemBase {
  itemType: "conferencePaper";
  title: string;
  abstractNote?: string;
  conferenceName: string;
  proceedingsTitle?: string;
  place?: string;
  publisher?: string;
  volume?: string;
  series?: string;
  date?: string;
  pages?: string;
  DOI?: string;
  ISBN?: string;
  language?: string;
  url?: string;
  accessDate?: string;
  archive?: string;
  archiveLocation?: string;
  libraryCatalog?: string;
  callNumber?: string;
  rights?: string;
  extra?: string;
}

/**
 * Properties specific to a thesis
 */
export interface ZoteroThesis extends ZoteroItemBase {
  itemType: "thesis";
  title: string;
  abstractNote?: string;
  thesisType?: string; // e.g., "PhD dissertation", "Master's thesis"
  university: string;
  place?: string;
  date?: string;
  numPages?: string;
  language?: string;
  shortTitle?: string;
  url?: string;
  accessDate?: string;
  archive?: string;
  archiveLocation?: string;
  libraryCatalog?: string;
  callNumber?: string;
  rights?: string;
  extra?: string;
}

/**
 * Properties specific to a webpage
 */
export interface ZoteroWebpage extends ZoteroItemBase {
  itemType: "webpage";
  title: string;
  abstractNote?: string;
  websiteTitle?: string;
  websiteType?: string;
  date?: string;
  shortTitle?: string;
  url: string;
  accessDate?: string;
  language?: string;
  rights?: string;
  extra?: string;
}
