import type { RefData } from "./zoteroApi";

// A Zotero library: the personal ("user") library or a shared "group" library.
export interface LibraryRef {
  // Local libraryID (items.libraryID). Stable within this database only.
  id: number;
  type: "user" | "group";
  // "My Library" for the personal library, else the group's name.
  name: string;
  // Online group id (groups.groupID); only set for group libraries. This — not
  // the local libraryID — is what zotero:// URIs for group items must use.
  groupID?: number;
}

export const USER_LIBRARY_NAME = "My Library";

// Globally-unique identity for an item. Zotero item *keys* are unique only
// within a library, so a personal item and a group item can share a key while
// being different papers. Prefer the local items.itemID (unique in this
// database); fall back to library+key for caches built before the id field
// existed. Used for search dedupe and React row keys so the two cannot drift.
export function itemIdentity(item: RefData): string {
  if (item.id != null) return `id:${item.id}`;
  return `${item.library ?? "?"}:${item.key}`;
}

// Build the zotero:// URI that selects an item in Zotero. Group items require
// the /groups/<groupID>/ form; everything else (personal library, or a cache
// built before group support) uses /library/. See Zotero's documented scheme:
//   zotero://select/library/items/<itemKey>
//   zotero://select/groups/<groupID>/items/<itemKey>
export function zoteroSelectUri(item: RefData): string {
  if (item.libraryType === "group" && item.groupID) {
    return `zotero://select/groups/${item.groupID}/items/${item.key}`;
  }
  return `zotero://select/library/items/${item.key}`;
}

// Build the zotero:// URI that opens an attachment PDF. open-pdf does not accept
// the "<libraryID>_<key>" shorthand, so group attachments must use the explicit
// /groups/<groupID>/ path — this is the bug that stopped group PDFs opening.
//   zotero://open-pdf/library/items/<attachmentKey>
//   zotero://open-pdf/groups/<groupID>/items/<attachmentKey>
export function zoteroOpenPdfUri(item: RefData, attachmentKey: string): string {
  if (item.libraryType === "group" && item.groupID) {
    return `zotero://open-pdf/groups/${item.groupID}/items/${attachmentKey}`;
  }
  return `zotero://open-pdf/library/items/${attachmentKey}`;
}
