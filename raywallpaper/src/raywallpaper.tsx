import { Cache } from "@raycast/api";
import ChoosingFolder from "./components/ChoosingFolder";
import GridGallery from "./components/GridGallery";
import { useEffect, useState, useMemo } from "react";

export default function Command() {
  const cache = useMemo(() => new Cache(), []);
  const [cached, setCached] = useState<string>("");
  const [isInitial, setIsInitial] = useState<boolean>(true);

  const setCachedFolder = (folder: string) => {
    cache.set("folder", folder);
    setCached(folder);
    setIsInitial(false);
  };

  useEffect(() => {
    const folder = cache.get("folder") ?? "";
    setCached(folder);
    setIsInitial(folder === "");
  }, [cache]);

  return cached.length > 0 ? (
    <GridGallery folder={cached} setCachedFolder={setCachedFolder} />
  ) : (
    <ChoosingFolder setCachedFolder={setCachedFolder} isInitial={isInitial} />
  );
}
