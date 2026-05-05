import { Cache } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Entry } from "../lib/entry";
import { runMigration, PINNED_ENTRIES_CACHE_KEY, PinnedEntries, PinnedEntryV2 } from "../lib/pinned-entries-migration";

interface PinnedEntry extends Entry {
  order: number;
}

function toDict(arr: Entry[]) {
  return arr.reduce<PinnedEntries>((acc, item, i) => {
    return {
      [item.uri]: {
        ...item,
        order: i,
      },
      ...acc,
    };
  }, {});
}

function toArray(dict: PinnedEntries) {
  return Object.values(dict).sort((a, b) => a.order - b.order);
}

// Run migration on module load with the real Raycast Cache
runMigration(new Cache());

export function usePinnedEntries() {
  const [entries, setEntries] = useCachedState<PinnedEntries>(PINNED_ENTRIES_CACHE_KEY, {});

  return {
    pinnedEntries: entries,
    pinEntry: (entry: Entry) => setEntries((s) => toDict([entry, ...toArray(s)])),
    unpinEntry: (entry: Pick<PinnedEntry, "uri">) =>
      setEntries((s) => toDict(toArray(s).filter((e) => e.uri !== entry.uri))),
    unpinAllEntries: () => setEntries({}),
    moveUp: (entry: PinnedEntryV2) =>
      setEntries((s) => {
        const arr = toArray(s);
        arr.splice(entry.order - 1, 2, arr[entry.order], arr[entry.order - 1]);
        return toDict(arr);
      }),
    moveDown: (entry: PinnedEntryV2) =>
      setEntries((s) => {
        const arr = toArray(s);
        arr.splice(entry.order, 2, arr[entry.order + 1], arr[entry.order]);
        return toDict(arr);
      }),
  };
}
