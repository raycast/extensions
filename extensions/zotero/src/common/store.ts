import { useRef, useState } from "react";
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
  // Monotonic id of the most recently started query. Searches are async and can
  // overlap (fast typing, a collection change, or a group-libraries change all
  // trigger runQuery), so an older search may resolve after a newer one. Only
  // the latest query is allowed to commit its results or clear the loading
  // flag; stale responses are dropped.
  const latestRef = useRef(0);
  const [store, setStore] = useState(() => ({
    queryResults: Array(sections.length).fill([]),
    queryIsLoading: !!initialLoading,
    clearResults: () => {
      setStore((prev) => ({ ...prev, queryResults: Array(sections.length).fill([]) }));
    },
    runQuery: async (q?: string) => {
      const queryId = ++latestRef.current;
      setStore((prev) => ({ ...prev, queryIsLoading: true }));
      try {
        const queryResults = await Promise.all(sections.map((section) => queryFunc(section, q)));
        if (queryId !== latestRef.current) return; // a newer query superseded this one
        setStore((prev) => ({ ...prev, queryResults }));
      } catch (e) {
        if (queryId !== latestRef.current) return;
        console.log("runQuery error", e);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to query",
          message: String(e),
        });
      } finally {
        // Only the latest query owns the loading flag; a stale one finishing must
        // not turn the spinner off while a newer query is still in flight.
        if (queryId === latestRef.current) {
          setStore((prev) => ({ ...prev, queryIsLoading: false }));
        }
      }
    },
  }));
  return store;
};
