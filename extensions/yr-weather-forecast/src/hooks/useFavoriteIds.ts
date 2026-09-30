import { useState, useCallback } from "react";
import { type LocationResult } from "../location-search";
import { isFavorite } from "../storage";
import { LocationUtils } from "../utils/location-utils";

export interface UseFavoriteIdsReturn {
  favoriteIds: Record<string, boolean>;
  isLocationFavorite: (locationId: string) => boolean;
  refreshFavoriteIds: (locations: LocationResult[]) => Promise<void>;
}

/**
 * Custom hook for managing favorite IDs for search results
 * Tracks which search result locations are currently in favorites
 */
export function useFavoriteIds(): UseFavoriteIdsReturn {
  const [favoriteIds, setFavoriteIds] = useState<Record<string, boolean>>({});

  // Check if a location is favorite
  const isLocationFavorite = useCallback(
    (locationId: string) => {
      return favoriteIds[locationId] || false;
    },
    [favoriteIds],
  );

  // Refresh favorite IDs for given locations
  const refreshFavoriteIds = useCallback(async (locations: LocationResult[]) => {
    if (locations.length === 0) {
      setFavoriteIds({});
      return;
    }

    const map: Record<string, boolean> = {};
    for (const location of locations) {
      const favLike = LocationUtils.createFavoriteFromSearchResult(
        location.id,
        location.displayName,
        location.lat,
        location.lon,
      );
      map[location.id] = await isFavorite(favLike);
    }
    setFavoriteIds(map);
  }, []);

  return {
    favoriteIds,
    isLocationFavorite,
    refreshFavoriteIds,
  };
}
