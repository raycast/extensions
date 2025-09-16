import { useCachedState } from "@raycast/utils";
import { Entry } from "../lib/entry";

interface PinnedEntry extends Entry {
  order: number;
}

type PinnedEntries = Record<string, PinnedEntry>;

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

export function usePinnedEntries() {
  const [entries, setEntries] = useCachedState<PinnedEntries>("pinnedEntries", {});

  return {
    pinnedEntries: entries,
    pinEntry: (entry: Entry) => setEntries((s) => toDict([entry, ...toArray(s)])),
    unpinEntry: (entry: Pick<PinnedEntry, "uri">) =>
      setEntries((s) => toDict(toArray(s).filter((e) => e.uri !== entry.uri))),
    unpinAllEntries: () => setEntries({}),
    moveUp: (entry: PinnedEntry) =>
      setEntries((s) => {
        const arr = toArray(s);
        arr.splice(entry.order - 1, 2, arr[entry.order], arr[entry.order - 1]);
        return toDict(arr);
      }),
    moveDown: (entry: PinnedEntry) =>
      setEntries((s) => {
        const arr = toArray(s);
        arr.splice(entry.order, 2, arr[entry.order + 1], arr[entry.order]);
        return toDict(arr);
      }),
  };
}
