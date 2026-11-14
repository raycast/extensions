import { LocalStorage } from "@raycast/api";

// Last-opened timestamps by item identity, stored in LocalStorage so they
// survive a cache rebuild (LocalStorage is separate from the sql.js cache).
const KEY = "interaction_times_1";
const MAX_ENTRIES = 200;

export type InteractionMap = Record<string, number>;

export async function loadInteractions(): Promise<InteractionMap> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as InteractionMap;
    }
  } catch (e) {
    console.error("failed to parse interactions", e);
  }
  return {};
}

// Serialized read-modify-write: two overlapping opens would otherwise read the
// same map and the later write would drop the earlier entry.
let writeChain: Promise<void> = Promise.resolve();

export function recordInteraction(id: string): Promise<void> {
  writeChain = writeChain
    .then(async () => {
      const map = await loadInteractions();
      map[id] = Date.now();
      // Bound the stored size: keep the most recent entries past the cap.
      const entries = Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_ENTRIES);
      await LocalStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
    })
    .catch((e) => console.error("failed to record interaction", e));
  return writeChain;
}
