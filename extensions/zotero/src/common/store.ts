import { useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { RefData } from "./zoteroApi";

export type Store = {
  queryResults: RefData[][];
  queryIsLoading: boolean;
  clearResults: () => void;
  runQuery: (q?: string) => Promise<void>;
};

export const useStore = (
  sections: string[],
  queryFunc: (section: string, q?: string) => Promise<RefData[]>,
  initialLoading?: boolean,
): Store => {
  const [store, setStore] = useState(() => ({
    queryResults: Array(sections.length).fill([]),
    queryIsLoading: !!initialLoading,
    clearResults: () => {
      setStore((prev) => ({ ...prev, queryResults: Array(sections.length).fill([]) }));
    },
    runQuery: async (q?: string) => {
      setStore((prev) => ({ ...prev, queryIsLoading: true }));
      try {
        const queryResults = await Promise.all(sections.map((section) => queryFunc(section, q)));
        setStore((prev) => ({ ...prev, queryResults }));
      } catch (e) {
        console.log("runQuery error", e);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to query",
          message: String(e),
        });
      } finally {
        setStore((prev) => ({ ...prev, queryIsLoading: false }));
      }
    },
  }));
  return store;
};
