import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
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
      showToast(Toast.Style.Failure, "Configuration Error", "No Zendesk instances configured.");
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
      let errorMessage = "An unknown error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      showToast(Toast.Style.Failure, "Search Failed", errorMessage);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  return { results, isLoading, performSearch };
}
