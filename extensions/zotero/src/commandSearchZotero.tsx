import { searchResources, getCollections } from "./common/zoteroApi";
import { useEffect, useState } from "react";
import { useStore } from "./common/store";
import { View } from "./common/View";

export default function MyView() {
  const store = useStore(["results"], (_, q) => searchResources(q as string), true);
  const [collections, setCollections] = useState<string[]>([]);
  const sectionNames = ["Search Results"];

  useEffect(() => {
    const init = async () => {
      const cols = await getCollections();
      setCollections(cols);
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
      onSearchTextChange={(text) => {
        store.runQuery(text);
      }}
      throttle
    />
  );
}
