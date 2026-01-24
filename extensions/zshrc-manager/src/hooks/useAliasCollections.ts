/**
 * useAliasCollections Hook
 *
 * Fetches and caches community alias collections from the external manifest.
 * Supports multiple source types: curated, omz-plugin, and external.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { LocalStorage } from "@raycast/api";
import {
  fetchManifest,
  fetchCollection,
  type Manifest,
  type ManifestCollection,
  type CollectionAttribution,
} from "../lib/collection-fetcher";
import type { ParsedAlias } from "../lib/parse-alias-file";
import { updateSynonymsCache } from "../lib/icons/synonym-cache";

/**
 * Re-export types for consumers
 */
export type { ParsedAlias } from "../lib/parse-alias-file";
export type { CollectionAttribution };

/**
 * Collection metadata from manifest (for list display)
 */
export interface CollectionMetadata {
  id: string;
  name: string;
  description: string;
  icon?: string | undefined; // Simple Icons slug for display
  category: string;
  tags?: string[] | undefined;
  source: {
    type: "curated" | "omz-plugin" | "external";
    pluginId?: string | undefined;
    path?: string | undefined;
    url?: string | undefined;
  };
}

/**
 * Loaded collection with aliases
 */
export interface AliasCollection extends CollectionMetadata {
  aliases: ParsedAlias[];
  aliasCount: number;
  loadedAt: number;
  attribution?: CollectionAttribution | undefined;
}

/**
 * Cache configuration
 */
const MANIFEST_CACHE_KEY = "alias-collections-manifest";
const MANIFEST_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const COLLECTION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Storage key for a collection
 */
function getCollectionCacheKey(id: string): string {
  return `alias-collection-${id}`;
}

/**
 * Cached manifest data
 */
interface CachedManifest {
  data: Manifest;
  cachedAt: number;
}

/**
 * Hook for managing alias collections from external manifest
 */
export function useAliasCollections() {
  const [collections, setCollections] = useState<CollectionMetadata[]>([]);
  const [loadedCollections, setLoadedCollections] = useState<Map<string, AliasCollection>>(new Map());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [manifestLoading, setManifestLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track in-flight requests to prevent duplicates
  const inFlightRequests = useRef<Set<string>>(new Set());
  const manifestFetched = useRef(false);

  /**
   * Load manifest from cache or fetch
   */
  const loadManifest = useCallback(async (): Promise<Manifest | null> => {
    if (manifestFetched.current && collections.length > 0) {
      return null; // Already loaded
    }

    try {
      // Check LocalStorage cache first
      const cached = await LocalStorage.getItem<string>(MANIFEST_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as CachedManifest;
          if (Date.now() - parsed.cachedAt < MANIFEST_CACHE_TTL) {
            const metadata = parsed.data.collections.map((c: ManifestCollection) => ({
              id: c.id,
              name: c.name,
              description: c.description,
              icon: c.icon,
              category: c.category,
              tags: c.tags,
              source: c.source,
            }));
            setCollections(metadata);
            manifestFetched.current = true;
            setManifestLoading(false);

            // Update icon synonyms cache from manifest
            if (parsed.data.iconSynonyms) {
              await updateSynonymsCache(parsed.data.iconSynonyms);
            }

            return parsed.data;
          }
        } catch {
          // Invalid cache, continue to fetch
        }
      }

      // Fetch fresh manifest
      const manifest = await fetchManifest();

      // Update icon synonyms cache from manifest
      if (manifest.iconSynonyms) {
        await updateSynonymsCache(manifest.iconSynonyms);
      }

      // Cache to LocalStorage
      const cacheData: CachedManifest = {
        data: manifest,
        cachedAt: Date.now(),
      };
      await LocalStorage.setItem(MANIFEST_CACHE_KEY, JSON.stringify(cacheData));

      // Update state with collection metadata
      const metadata = manifest.collections.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: c.icon,
        category: c.category,
        tags: c.tags,
        source: c.source,
      }));
      setCollections(metadata);
      manifestFetched.current = true;
      setManifestLoading(false);
      return manifest;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setManifestLoading(false);
      return null;
    }
  }, [collections.length]);

  // Load manifest on mount
  useEffect(() => {
    loadManifest();
  }, [loadManifest]);

  /**
   * Load a collection from cache or fetch it
   */
  const loadCollection = useCallback(
    async (id: string): Promise<AliasCollection | null> => {
      const metadata = collections.find((c) => c.id === id);
      if (!metadata) {
        // Manifest might not be loaded yet
        if (manifestLoading) {
          return null;
        }
        setError(new Error(`Unknown collection: ${id}`));
        return null;
      }

      // Prevent duplicate requests
      if (inFlightRequests.current.has(id)) {
        return null;
      }

      // Mark as loading
      inFlightRequests.current.add(id);
      setLoadingIds((prev) => new Set([...prev, id]));
      setError(null);

      try {
        // Check LocalStorage cache first
        const cached = await LocalStorage.getItem<string>(getCollectionCacheKey(id));
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as AliasCollection;
            if (Date.now() - parsed.loadedAt < COLLECTION_CACHE_TTL) {
              setLoadedCollections((prev) => new Map([...prev, [id, parsed]]));
              setLoadingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
              inFlightRequests.current.delete(id);
              return parsed;
            }
          } catch {
            // Invalid cache, continue to fetch
          }
        }

        // Fetch collection based on source type
        const manifestCollection: ManifestCollection = {
          id: metadata.id,
          name: metadata.name,
          description: metadata.description,
          category: metadata.category,
          tags: metadata.tags,
          source: metadata.source,
        };

        const loaded = await fetchCollection(manifestCollection);

        const collection: AliasCollection = {
          id: loaded.id,
          name: loaded.name,
          description: loaded.description,
          icon: loaded.icon,
          category: loaded.category,
          source: loaded.source,
          aliases: loaded.aliases,
          aliasCount: loaded.aliasCount,
          loadedAt: loaded.loadedAt,
          attribution: loaded.attribution,
        };

        // Cache to LocalStorage
        await LocalStorage.setItem(getCollectionCacheKey(id), JSON.stringify(collection));

        setLoadedCollections((prev) => new Map([...prev, [id, collection]]));
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        inFlightRequests.current.delete(id);
        return collection;
      } catch (err) {
        inFlightRequests.current.delete(id);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return null;
      }
    },
    [collections, manifestLoading],
  );

  /**
   * Refresh a collection (bypass cache)
   */
  const refreshCollection = useCallback(
    async (id: string): Promise<AliasCollection | null> => {
      await LocalStorage.removeItem(getCollectionCacheKey(id));
      inFlightRequests.current.delete(id);
      setLoadedCollections((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      return loadCollection(id);
    },
    [loadCollection],
  );

  /**
   * Refresh manifest (bypass cache)
   */
  const refreshManifest = useCallback(async (): Promise<void> => {
    await LocalStorage.removeItem(MANIFEST_CACHE_KEY);
    manifestFetched.current = false;
    setCollections([]);
    setManifestLoading(true);
    await loadManifest();
  }, [loadManifest]);

  /**
   * Check if a collection is currently loading
   */
  const isLoading = useCallback(
    (id: string) => {
      return loadingIds.has(id);
    },
    [loadingIds],
  );

  /**
   * Get a loaded collection from in-memory state
   */
  const getCollection = useCallback(
    (id: string) => {
      return loadedCollections.get(id);
    },
    [loadedCollections],
  );

  return {
    collections,
    loadedCollections,
    loadCollection,
    refreshCollection,
    refreshManifest,
    getCollection,
    isLoading,
    manifestLoading,
    error,
  };
}
