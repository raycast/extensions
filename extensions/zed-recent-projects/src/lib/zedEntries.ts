import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "entries";

export interface ZedEntry {
  uri: string;
  lastOpened: number;
}

export type ZedEntries = Record<string, ZedEntry>;

export async function getZedEntires(): Promise<ZedEntries> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.log(e);
    }
  }

  return {};
}

export function setZedEntries(entries: ZedEntries) {
  return LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function saveZedEntry(entry: ZedEntry) {
  const stored = await getZedEntires();
  await setZedEntries({
    ...stored,
    [entry.uri]: entry,
  });
}

export async function saveZedEntries(entries: ZedEntry[]) {
  const stored = await getZedEntires();
  await setZedEntries(
    entries.reduce(
      (acc, e) => ({
        ...acc,
        [e.uri]: e,
      }),
      stored
    )
  );
}
