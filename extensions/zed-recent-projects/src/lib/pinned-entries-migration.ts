import { basename } from "path";

/**
 * Pinned entries migration logic.
 * This file contains pure functions without Raycast dependencies for testability.
 */

export const PINNED_STORE_VERSION_KEY = "PINNED_STORE_VERSION";
export const PINNED_STORE_VERSION = "2"; // Bumped for paths: string[] migration
export const PINNED_ENTRIES_CACHE_KEY = "pinnedEntries";

/**
 * Legacy v0 format - used `is_remote` boolean
 */
export interface LegacyPinnedEntryV0 {
  id: number;
  uri: string;
  path: string;
  title: string;
  subtitle: string;
  is_remote: boolean;
  order: number;
}

/**
 * Legacy v1 format - used `type` string but single `path`
 */
export interface LegacyPinnedEntryV1 {
  id: number;
  uri: string;
  path: string;
  title: string;
  subtitle: string;
  type: "local" | "remote";
  order: number;
}

/**
 * Current v2 format - uses `paths` array
 */
export interface PinnedEntryV2 {
  id: number;
  uri: string;
  paths: string[];
  title: string;
  subtitle: string;
  type: "local" | "remote";
  order: number;
  isOpen?: boolean;
  wsl?: { user: string | null; distro: string | null } | null;
}

export type PinnedEntries = Record<string, PinnedEntryV2>;

/**
 * Cache interface for testability
 */
export interface CacheStore {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

/**
 * Migrate from v0 (is_remote) format to v2 (paths array) format
 */
export function migrateFromV0(legacyEntries: Record<string, LegacyPinnedEntryV0>): PinnedEntries {
  const pinnedEntries: PinnedEntries = {};

  for (const [key, value] of Object.entries(legacyEntries)) {
    const pinnedEntry: PinnedEntryV2 = {
      id: value.id,
      uri: value.uri,
      paths: [value.path],
      title: value.title || decodeURIComponent(basename(value.path)),
      subtitle: value.subtitle,
      type: value.is_remote ? "remote" : "local",
      order: value.order,
    };
    pinnedEntries[key] = pinnedEntry;
  }

  return pinnedEntries;
}

/**
 * Migrate from v1 (single path) format to v2 (paths array) format
 */
export function migrateFromV1(legacyEntries: Record<string, LegacyPinnedEntryV1>): PinnedEntries {
  const pinnedEntries: PinnedEntries = {};

  for (const [key, value] of Object.entries(legacyEntries)) {
    const pinnedEntry: PinnedEntryV2 = {
      id: value.id,
      uri: value.uri,
      paths: [value.path],
      title: value.title || decodeURIComponent(basename(value.path)),
      subtitle: value.subtitle,
      type: value.type,
      order: value.order,
    };
    pinnedEntries[key] = pinnedEntry;
  }

  return pinnedEntries;
}

/**
 * Run cache migration with injectable cache store for testability
 */
export function runMigration(cache: CacheStore): void {
  const storeVersion = cache.get(PINNED_STORE_VERSION_KEY);

  // No version - migrate from v0 (is_remote) to v2 (paths array)
  if (!storeVersion) {
    try {
      const cached = cache.get(PINNED_ENTRIES_CACHE_KEY);
      if (!cached) {
        cache.set(PINNED_STORE_VERSION_KEY, PINNED_STORE_VERSION);
        return;
      }

      const legacyEntries = JSON.parse(cached) as Record<string, LegacyPinnedEntryV0>;
      const pinnedEntries = migrateFromV0(legacyEntries);

      cache.set(PINNED_ENTRIES_CACHE_KEY, JSON.stringify(pinnedEntries));
      cache.set(PINNED_STORE_VERSION_KEY, PINNED_STORE_VERSION);
    } catch (err) {
      console.error("Failed to migrate cache from v0", err);
    }
    return;
  }

  // Version 1 - migrate from single path to paths array
  if (storeVersion === "1") {
    try {
      const cached = cache.get(PINNED_ENTRIES_CACHE_KEY);
      if (!cached) {
        cache.set(PINNED_STORE_VERSION_KEY, PINNED_STORE_VERSION);
        return;
      }

      const legacyEntries = JSON.parse(cached) as Record<string, LegacyPinnedEntryV1>;
      const pinnedEntries = migrateFromV1(legacyEntries);

      cache.set(PINNED_ENTRIES_CACHE_KEY, JSON.stringify(pinnedEntries));
      cache.set(PINNED_STORE_VERSION_KEY, PINNED_STORE_VERSION);
    } catch (err) {
      console.error("Failed to migrate cache from v1", err);
    }
  }

  // Version 2 - current version, no migration needed
}
