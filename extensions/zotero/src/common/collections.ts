// A Zotero collection. Identified by its key (globally unique); the name is for
// display only and is not necessarily unique.
export interface CollectionRef {
  key: string;
  name: string;
  library: number;
}

// A collection as offered in the dropdown: a stable id to filter by and a title
// to show. Titles are made unique so the user can tell same-named collections
// apart, but filtering always uses the id.
export interface CollectionOption {
  key: string;
  title: string;
}

// Globally-unique id for a collection. Zotero collection keys are unique only
// within a library (like item keys), so a personal and a group collection can
// share a key; qualifying with the libraryID keeps them distinct. getData tags
// each item's collections with this same id so filtering never conflates them.
export function collectionId(library: number, key: string): string {
  return `${library}:${key}`;
}

// Build dropdown options from raw collections, disambiguating duplicate names.
// A name shared across libraries gets the library name appended; if that still
// collides (same-named collections within one library, e.g. subcollections
// under different parents), a short key fragment is appended so every title is
// unique.
export function buildCollectionOptions(
  collections: CollectionRef[],
  libraryNames: Map<number, string>,
): CollectionOption[] {
  // For each name, note how many libraries it spans. A name that collides only
  // within one library gains nothing from a library-name suffix, so it goes
  // straight to the key suffix below.
  const librariesByName = new Map<string, Set<number>>();
  for (const c of collections) {
    if (!librariesByName.has(c.name)) librariesByName.set(c.name, new Set());
    librariesByName.get(c.name)!.add(c.library);
  }

  const options: CollectionOption[] = collections.map((c) => {
    let title = c.name;
    if ((librariesByName.get(c.name)?.size ?? 0) > 1) {
      const libName = libraryNames.get(c.library) ?? `Library ${c.library}`;
      title = `${c.name} (${libName})`;
    }
    return { key: collectionId(c.library, c.key), title };
  });

  // Second pass: any titles that still collide get a short key suffix.
  const titleCounts = new Map<string, number>();
  for (const o of options) {
    titleCounts.set(o.title, (titleCounts.get(o.title) ?? 0) + 1);
  }
  for (const o of options) {
    if ((titleCounts.get(o.title) ?? 0) > 1) {
      // o.key is "<library>:<key>"; use a fragment of the collection key part.
      const rawKey = o.key.slice(o.key.indexOf(":") + 1);
      o.title = `${o.title} [${rawKey.slice(0, 4)}]`;
    }
  }

  return options;
}

// Options for only the collections the user can currently search: those in the
// personal library plus any opted-in group libraries. Collections from groups
// the user has not included are omitted, so the dropdown never offers a
// collection that would always return nothing.
export function visibleCollectionOptions(
  collections: CollectionRef[],
  allowedLibraryIds: Iterable<number>,
  libraryNames: Map<number, string>,
): CollectionOption[] {
  const allowed = new Set(allowedLibraryIds);
  const inScope = collections.filter((c) => allowed.has(c.library));
  return buildCollectionOptions(inScope, libraryNames);
}
