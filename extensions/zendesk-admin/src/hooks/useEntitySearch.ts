import { useState, useEffect } from "react";
import { showFailureToast } from "@raycast/utils";
import { ZendeskInstance } from "../utils/preferences";

interface UseEntitySearchOptions<T> {
  searchFunction: (instance: ZendeskInstance, onPage: (items: T[]) => void) => Promise<void>;
  instance?: ZendeskInstance;
  dependencies?: unknown[];
}

export function useEntitySearch<T>({ searchFunction, instance, dependencies = [] }: UseEntitySearchOptions<T>) {
  const [results, setResults] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (instance) {
      performSearch();
    } else {
      setIsLoading(false);
    }
  }, [instance, ...dependencies]);

  async function performSearch() {
    if (!instance) {
      showFailureToast(new Error("No Zendesk instances configured."), { title: "Configuration Error" });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data: T[] = [];
      await searchFunction(instance, (page) => {
        data.push(...page);
      });
      setResults(data);
    } catch (error: unknown) {
      showFailureToast(error, { title: "Search Failed" });
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  return { results, isLoading, performSearch };
}
