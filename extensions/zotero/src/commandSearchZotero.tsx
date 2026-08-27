import {
  searchResources,
  getCollections,
  getLibraries,
  getIncludedGroupLibraries,
  setIncludedGroupLibraries,
} from "./common/zoteroApi";
import type { LibraryRef } from "./common/library";
import { buildCollectionOptions, type CollectionOption } from "./common/collections";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./common/store";
import { View } from "./common/View";

export default function MyView() {
  // Keep the current search text and collection in refs so either one changing
  // re-runs the same combined query. Collection scoping is applied inside
  // searchResources (before the render cap), not by post-filtering the results.
  const textRef = useRef("");
  const collectionRef = useRef("All");
  const store = useStore(["results"], (_, q) => searchResources(q as string, collectionRef.current), true);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [collection, setCollection] = useState("All");
  const [groupLibraries, setGroupLibraries] = useState<LibraryRef[]>([]);
  const [includedGroups, setIncludedGroups] = useState<number[]>([]);
  const sectionNames = ["Search Results"];

  useEffect(() => {
    const init = async () => {
      const [cols, libraries, included] = await Promise.all([
        getCollections(),
        getLibraries(),
        getIncludedGroupLibraries(),
      ]);
      const libraryNames = new Map(libraries.map((l) => [l.id, l.name]));
      setCollections(buildCollectionOptions(cols, libraryNames));
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
      collections={collections}
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
        setIncludedGroups(ids);
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
