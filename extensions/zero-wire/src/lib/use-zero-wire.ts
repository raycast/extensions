import { useEffect, useSyncExternalStore } from "react";
import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { type Briefing, type Database } from "./model";
import { repository, service } from "./runtime";

let state: { db: Database | null; loading: boolean; error: string | null } = { db: null, loading: true, error: null };
const listeners = new Set<() => void>();
let started = false;
let activeOperations = 0;
function publish(next: typeof state) {
  state = state.db && next.db && state.db.revision > next.db.revision ? { ...next, db: state.db } : next;
  listeners.forEach((listener) => listener());
}
async function perform(operation: () => Promise<Database>, manual = false) {
  activeOperations++;
  publish({ ...state, loading: true });
  try {
    const previousAttempt = state.db?.sync.lastAttempt;
    const db = await operation();
    publish({ db, loading: activeOperations > 1, error: null });
    if (manual && db.sync.error)
      await showToast({ style: Toast.Style.Failure, title: "Source unavailable", message: db.sync.error });
    else if (manual)
      await showToast({
        style: Toast.Style.Success,
        title: db.sync.lastAttempt === previousAttempt ? "Using cached briefings" : "Briefings refreshed",
        message:
          db.sync.lastAttempt === previousAttempt
            ? "Source checks are limited to once per hour. Server cooldowns may take longer."
            : undefined,
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Local data could not be loaded";
    publish({ ...state, loading: false, error: message });
    await showFailureToast(error, { title: "Zero Wire could not update" });
  } finally {
    activeOperations--;
    publish({ ...state, loading: activeOperations > 0 });
  }
}
async function mutate(change: (db: Database) => Database) {
  await perform(() => repository.update(change));
}
export function useZeroWire() {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
  useEffect(() => {
    if (started) return;
    started = true;
    void perform(async () => {
      const db = await repository.read();
      publish({ db, loading: true, error: null });
      return service.sync();
    });
  }, []);
  return {
    ...current,
    error: current.error ?? current.db?.sync.error ?? null,
    refresh: () => perform(() => service.sync(true), true),
    loadDetail: (b: Briefing, force = false) => perform(() => service.detail(b, force), force),
    toggleBookmark: (b: Briefing) =>
      mutate((db) => ({
        ...db,
        archive: { ...db.archive, [b.id]: db.archive[b.id] ?? b },
        bookmarks: { ...db.bookmarks, [b.id]: !db.bookmarks[b.id] },
      })),
    review: (b: Briefing, reviewed: boolean) =>
      mutate((db) => ({ ...db, reviewed: { ...db.reviewed, [b.id]: reviewed ? b.hash : "" } })),
    toggleFollow: (tag: Briefing["tags"][number]) =>
      mutate((db) => {
        const followed = { ...db.followed };
        if (tag.id in followed) delete followed[tag.id];
        else followed[tag.id] = tag.name;
        return { ...db, followed };
      }),
  };
}
