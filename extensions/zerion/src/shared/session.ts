import { useSyncExternalStore } from "react";

/**
 * Whether the API has rejected the stored key (401) during this command
 * session. Any request can be the one that discovers the revocation — a
 * Token Details chart, Recent Activity — so instead of routing each hook's
 * error to the screen's gate, the api layer raises this flag and the gate
 * subscribes to it.
 */
let revoked = false;
const listeners = new Set<() => void>();

export function markSessionRevoked() {
  if (revoked) {
    return;
  }
  revoked = true;
  listeners.forEach((listener) => listener());
}

export function markSessionRestored() {
  if (!revoked) {
    return;
  }
  revoked = false;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSessionRevoked() {
  return useSyncExternalStore(
    subscribe,
    () => revoked,
    () => revoked,
  );
}
