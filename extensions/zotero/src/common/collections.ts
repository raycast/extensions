// A Zotero collection. Identified by its key (globally unique); the name is for
// display only and is not necessarily unique.
export interface CollectionRef {
  key: string;
  name: string;
  library: number;
}

// A collection as offered in the dropdown: a stable key to filter by and a title
// to show. Titles are made unique so the user can tell same-named collections
// apart, but filtering always uses the key.
export interface CollectionOption {
  key: string;
  title: string;
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
    return { key: c.key, title };
  });

  // Second pass: any titles that still collide get a short key suffix.
  const titleCounts = new Map<string, number>();
  for (const o of options) {
    titleCounts.set(o.title, (titleCounts.get(o.title) ?? 0) + 1);
  }
  for (const o of options) {
    if ((titleCounts.get(o.title) ?? 0) > 1) {
      o.title = `${o.title} [${o.key.slice(0, 4)}]`;
    }
  }

  return options;
}
