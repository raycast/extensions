import { useEffect, useState } from "react";
import Zotero from "./utils/Zotero";
import CitationList from "./components/CitationList";
import { ZoteroItem } from "./types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<ZoteroItem[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const zotero = new Zotero();
        const fetchedItems = await zotero.getItems();
        setItems(fetchedItems);
        setError(null);
      } catch (error) {
        setError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return <CitationList items={items} isLoading={isLoading} error={error} />;
}
