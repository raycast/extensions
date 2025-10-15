import { basename } from "path";
import { Cache } from "@raycast/api";
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

/**
 * PinnedEntry type was changed in https://github.com/raycast/extensions/pull/21528, which broke pinned entries cache
 * This code performs cache migration
 */
const PINNED_STORE_VERSION_KEY = "PINNED_STORE_VERSION";
const PINNED_STORE_VERSION = "1";
const PINNED_ENTRIES_CACHE_KEY = "pinnedEntries";

interface LegacyPinnedEntry {
  id: number;
  uri: string;
  path: string;
  title: string;
  subtitle: string;
  is_remote: boolean;
  order: number;
}

function migrateCache() {
  const cache = new Cache();
  const storeVersion = cache.get(PINNED_STORE_VERSION_KEY);
  if (!storeVersion) {
    try {
      const cached = cache.get(PINNED_ENTRIES_CACHE_KEY);
      if (!cached) {
        return;
      }

      const legacyEntries = JSON.parse(cached) as Record<string, LegacyPinnedEntry>;
      const pinnedEntries: PinnedEntries = {};

      for (const [key, value] of Object.entries(legacyEntries)) {
        const pinnedEntry: PinnedEntry = {
          id: value.id,
          uri: value.uri,
          path: value.path,
          title: value.title || decodeURIComponent(basename(value.path)),
          subtitle: value.subtitle,
          type: value.is_remote ? "remote" : "local",
          order: value.order,
        };
        pinnedEntries[key] = pinnedEntry;
      }

      cache.set(PINNED_ENTRIES_CACHE_KEY, JSON.stringify(pinnedEntries));
      cache.set(PINNED_STORE_VERSION_KEY, PINNED_STORE_VERSION);
    } catch (err) {
      console.error("Failed to migrate cache", err);
    }
  }
}

migrateCache();

export function usePinnedEntries() {
  const [entries, setEntries] = useCachedState<PinnedEntries>(PINNED_ENTRIES_CACHE_KEY, {});

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
