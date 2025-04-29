import { useCachedState } from "@raycast/utils";
import { ZedEntry } from "../lib/zedEntries";

interface PinnedZedEntry extends ZedEntry {
  order: number;
}

type PinnedZedEntries = Record<string, PinnedZedEntry>;

function toDict(arr: ZedEntry[]) {
  return arr.reduce<PinnedZedEntries>((acc, item, i) => {
    return {
      [item.uri]: {
        ...item,
        order: i,
      },
      ...acc,
    };
  }, {});
}

function toArray(dict: PinnedZedEntries) {
  return Object.values(dict).sort((a, b) => a.order - b.order);
}

export function usePinnedEntries() {
  const [entries, setEntries] = useCachedState<PinnedZedEntries>("pinnedEntries", {});

  return {
    pinnedEntries: entries,
    pinEntry: (entry: ZedEntry) => setEntries((s) => toDict([entry, ...toArray(s)])),
    unpinEntry: (entry: Pick<PinnedZedEntry, "uri">) =>
      setEntries((s) => toDict(toArray(s).filter((e) => e.uri !== entry.uri))),
    unpinAllEntries: () => setEntries({}),
    moveUp: (entry: PinnedZedEntry) =>
      setEntries((s) => {
        const arr = toArray(s);
        arr.splice(entry.order - 1, 2, arr[entry.order], arr[entry.order - 1]);
        return toDict(arr);
      }),
    moveDown: (entry: PinnedZedEntry) =>
      setEntries((s) => {
        const arr = toArray(s);
        arr.splice(entry.order, 2, arr[entry.order + 1], arr[entry.order]);
        return toDict(arr);
      }),
  };
}
