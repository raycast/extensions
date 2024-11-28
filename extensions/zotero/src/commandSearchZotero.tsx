import { searchResources, getCollections } from "./common/zoteroApi";
import { useEffect, useState } from "react";
import { useStore } from "./common/store";
import { View } from "./common/View";

export default function MyView() {
  const store = useStore(["results"], (_, q) => searchResources(q as string));
  const [collections, setCollections] = useState<string[]>([]);
  const sectionNames = ["Search Results"];

  useEffect(() => {
    const getCols = async () => {
      const cols = await getCollections();
      setCollections(cols);
    };

    getCols(); // run it, run it

    return () => {
      // this now gets called when the component unmounts
    };
  }, []);

  return (
    <View
      sectionNames={sectionNames}
      queryResults={store.queryResults}
      isLoading={store.queryIsLoading}
      collections={collections}
      onSearchTextChange={(text) => {
        if (text) {
          store.runQuery(text);
        } else {
          store.clearResults();
        }
      }}
      throttle
    />
  );
}
