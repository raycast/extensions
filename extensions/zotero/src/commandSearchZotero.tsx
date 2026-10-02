import {
  searchResources,
  getCollections,
  getLibraries,
  getIncludedGroupLibraries,
  setIncludedGroupLibraries,
} from "./common/zoteroApi";
import type { LibraryRef } from "./common/library";
import { visibleCollectionOptions, type CollectionRef, type CollectionOption } from "./common/collections";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./common/store";
import { View } from "./common/View";

// Libraries the search covers: the personal library plus any opted-in groups.
function allowedLibraryIds(libraries: LibraryRef[], includedGroups: number[]): number[] {
  const userIds = libraries.filter((l) => l.type === "user").map((l) => l.id);
  return [...userIds, ...includedGroups];
}

export default function MyView() {
  // Keep the current search text and collection in refs so either one changing
  // re-runs the same combined query. Collection scoping is applied inside
  // searchResources (before the render cap), not by post-filtering the results.
  const textRef = useRef("");
  const collectionRef = useRef("All");
  const store = useStore(["results"], (_, q) => searchResources(q as string, collectionRef.current), true);
  const [collectionOptions, setCollectionOptions] = useState<CollectionOption[]>([]);
  const [collection, setCollection] = useState("All");
  const [groupLibraries, setGroupLibraries] = useState<LibraryRef[]>([]);
  const [includedGroups, setIncludedGroups] = useState<number[]>([]);
  // Raw inputs kept so the visible collection options can be recomputed when the
  // set of included group libraries changes.
  const allCollectionsRef = useRef<CollectionRef[]>([]);
  const librariesRef = useRef<LibraryRef[]>([]);
  const sectionNames = ["Search Results"];

  useEffect(() => {
    const init = async () => {
      const [cols, libraries, included] = await Promise.all([
        getCollections(),
        getLibraries(),
        getIncludedGroupLibraries(),
      ]);
      allCollectionsRef.current = cols;
      librariesRef.current = libraries;
      const names = new Map(libraries.map((l) => [l.id, l.name]));
      setCollectionOptions(visibleCollectionOptions(cols, allowedLibraryIds(libraries, included), names));
      setGroupLibraries(libraries.filter((l) => l.type === "group"));
      setIncludedGroups(included);
      await store.runQuery("");
    };

    init();
  }, []);

  return (
    <View
      sectionNames={sectionNames}
      queryResults={store.queryResults}
      isLoading={store.queryIsLoading}
      collections={collectionOptions}
      selectedCollection={collection}
      onCollectionChange={(value) => {
        collectionRef.current = value;
        setCollection(value);
        store.runQuery(textRef.current);
      }}
      groupLibraries={groupLibraries}
      includedGroups={includedGroups}
      onSaveGroups={async (ids) => {
        await setIncludedGroupLibraries(ids);
        const libraries = librariesRef.current;
        const names = new Map(libraries.map((l) => [l.id, l.name]));
        const options = visibleCollectionOptions(allCollectionsRef.current, allowedLibraryIds(libraries, ids), names);
        // If the selected collection now falls outside the included libraries,
        // reset to "All" so the user isn't left with a silently empty result set.
        if (collectionRef.current !== "All" && !options.some((o) => o.key === collectionRef.current)) {
          collectionRef.current = "All";
          setCollection("All");
        }
        setIncludedGroups(ids);
        setCollectionOptions(options);
        store.runQuery(textRef.current);
      }}
      onSearchTextChange={(text) => {
        textRef.current = text;
        store.runQuery(text);
      }}
      throttle
    />
  );
}
