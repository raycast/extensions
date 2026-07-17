import { useState, useEffect, useCallback, useRef } from "react";
import { getWeather, type TimeseriesEntry } from "../weather-client";
import { getSunTimes, type SunTimes } from "../sunrise-client";
import {
  addFavorite,
  removeFavorite,
  moveFavoriteUp,
  moveFavoriteDown,
  type FavoriteLocation,
  getFavorites,
} from "../storage";
import { LocationUtils } from "../utils/location-utils";
import { DebugLogger } from "../utils/debug-utils";
import { TIMING_THRESHOLDS } from "../config/weather-config";
import { ToastMessages } from "../utils/toast-utils";

export interface UseFavoritesReturn {
  // Favorites state
  favorites: FavoriteLocation[];
  favoritesLoaded: boolean;
  favoriteWeather: Record<string, TimeseriesEntry | undefined>;
  sunTimes: Record<string, SunTimes>;
  favoriteErrors: Record<string, boolean>;
  favoritesLoading: Record<string, boolean>;
  weatherDataInitialized: boolean;
  isInitialLoad: boolean;
  isBackgroundLoading: boolean; // New: indicates if background loading is in progress

  // Favorites actions
  addFavoriteLocation: (location: FavoriteLocation) => Promise<boolean>;
  removeFavoriteLocation: (location: FavoriteLocation) => Promise<void>;
  moveFavoriteUp: (location: FavoriteLocation) => Promise<void>;
  moveFavoriteDown: (location: FavoriteLocation) => Promise<void>;
  refreshFavorites: () => Promise<void>;

  // Utility functions
  getFavoriteWeather: (locationId: string, lat: number, lon: number) => TimeseriesEntry | undefined;
  getFavoriteSunTimes: (locationId: string, lat: number, lon: number) => SunTimes | undefined;
  isFavoriteLoading: (locationId: string, lat: number, lon: number) => boolean;
  hasFavoriteError: (locationId: string, lat: number, lon: number) => boolean;
}

/**
 * Custom hook for managing favorites functionality
 * Handles loading favorites, weather data, error states, and favorite operations
 */
export function useFavorites(): UseFavoritesReturn {
  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [favoriteWeather, setFavoriteWeather] = useState<Record<string, TimeseriesEntry | undefined>>({});
  const [sunTimes, setSunTimes] = useState<Record<string, SunTimes>>({});
  const [favoriteErrors, setFavoriteErrors] = useState<Record<string, boolean>>({});
  const [favoritesLoading, setFavoritesLoading] = useState<Record<string, boolean>>({});
  const [weatherDataInitialized, setWeatherDataInitialized] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const favoriteWeatherRef = useRef(favoriteWeather);
  const isInitialLoadRef = useRef(isInitialLoad);

  useEffect(() => {
    favoriteWeatherRef.current = favoriteWeather;
  }, [favoriteWeather]);

  useEffect(() => {
    isInitialLoadRef.current = isInitialLoad;
  }, [isInitialLoad]);

  // Load favorites on mount
  useEffect(() => {
    (async () => {
      const favs = await getFavorites();
      setFavorites(favs);
      setFavoritesLoaded(true);
      // If no favorites, we're done with initial load
      if (favs.length === 0) {
        setIsInitialLoad(false);
      }
    })();
  }, []);

  // Load weather data for favorites
  useEffect(() => {
    if (favorites.length === 0) {
      setFavoriteWeather({});
      setSunTimes({});
      setFavoriteErrors({});
      setFavoritesLoading({});
      setWeatherDataInitialized(true); // No favorites to load, so we're "done"
      setIsInitialLoad(false);
      setIsBackgroundLoading(false);
      return;
    }

    const hasOwn = (record: Record<string, unknown>, key: string): boolean =>
      Object.prototype.hasOwnProperty.call(record, key);

    const favoriteEntries = favorites.map((fav) => ({
      fav,
      key: LocationUtils.getLocationKey(fav.id, fav.lat, fav.lon),
    }));
    const activeKeys = new Set(favoriteEntries.map((entry) => entry.key));
    const pruneToActiveKeys = <T>(record: Record<string, T>): Record<string, T> => {
      return Object.fromEntries(Object.entries(record).filter(([key]) => activeKeys.has(key))) as Record<string, T>;
    };

    // Keep keyed state aligned with active favorites.
    setFavoriteWeather((prev) => pruneToActiveKeys(prev));
    setSunTimes((prev) => pruneToActiveKeys(prev));
    setFavoriteErrors((prev) => pruneToActiveKeys(prev));
    setFavoritesLoading((prev) => pruneToActiveKeys(prev));

    const latestFavoriteWeather = favoriteWeatherRef.current;
    const missingEntries = favoriteEntries.filter(({ key }) => {
      return !hasOwn(latestFavoriteWeather as Record<string, unknown>, key);
    });

    if (missingEntries.length === 0) {
      setWeatherDataInitialized(true);
      if (isInitialLoadRef.current) {
        setIsInitialLoad(false);
      }
      setIsBackgroundLoading(false);
      return;
    }

    let cancelled = false;
    if (isInitialLoadRef.current) {
      setWeatherDataInitialized(false); // Initial load still in progress
    }
    setIsBackgroundLoading(true); // Start background loading

    async function fetchMissing() {
      let toastShown = false;

      // Mark only missing favorites as loading and clear stale errors from prior failures.
      setFavoritesLoading((prev) => {
        const next = pruneToActiveKeys(prev);
        missingEntries.forEach(({ key }) => {
          next[key] = true;
        });
        return next;
      });
      setFavoriteErrors((prev) => {
        const next = { ...prev };
        for (const { key } of missingEntries) {
          delete next[key];
        }
        return next;
      });

      try {
        const entries = await Promise.all(
          missingEntries.map(async ({ fav, key }) => {
            try {
              const ts = await getWeather(fav.lat, fav.lon);
              const sun = await getSunTimes(fav.lat, fav.lon).catch(() => ({}) as SunTimes);
              return [key, ts, sun] as const;
            } catch {
              if (!toastShown) {
                toastShown = true;
                void ToastMessages.weatherApiUnavailable();
              }
              // Immediately mark error so UI doesn't stay stuck in "Loading..."
              if (!cancelled) {
                setFavoriteErrors((prev) => ({ ...prev, [key]: true }));
                setFavoritesLoading((prev) => ({ ...prev, [key]: false }));
                setSunTimes((prev) => ({ ...prev, [key]: {} as SunTimes }));
              }
              return [key, undefined, {} as SunTimes] as const;
            }
          }),
        );

        if (!cancelled) {
          // Set each entry individually so updates can stream to the UI.
          for (const [key, ts, sun] of entries) {
            if (ts) {
              setFavoriteWeather((prev) => ({ ...prev, [key]: ts }));
            }
            setSunTimes((prev) => ({ ...prev, [key]: sun }));
            // Mark this key as no longer loading.
            setFavoritesLoading((prev) => ({ ...prev, [key]: false }));
          }

          // Preserve the existing transition delay to avoid visual flashes.
          setTimeout(() => {
            setWeatherDataInitialized(true);
            setIsInitialLoad(false); // Mark initial load as complete
            setIsBackgroundLoading(false); // Background loading complete
          }, TIMING_THRESHOLDS.COMPONENT_INIT_DELAY);
        }
      } catch (err) {
        DebugLogger.error("Error fetching missing favorites:", err);
        if (!cancelled) {
          setFavoritesLoading((prev) => {
            const next = pruneToActiveKeys(prev);
            missingEntries.forEach(({ key }) => {
              next[key] = false;
            });
            return next;
          });
          setTimeout(() => {
            setWeatherDataInitialized(true);
            setIsInitialLoad(false); // Mark initial load as complete
            setIsBackgroundLoading(false); // Background loading complete
          }, TIMING_THRESHOLDS.COMPONENT_INIT_DELAY);
        }
      }
    }

    fetchMissing();
    return () => {
      cancelled = true;
    };
  }, [favorites]);

  // Refresh favorites from storage
  const refreshFavorites = useCallback(async () => {
    const favs = await getFavorites();
    setFavorites(favs);
  }, []);

  // Add favorite location
  const addFavoriteLocation = useCallback(
    async (location: FavoriteLocation) => {
      const wasAdded = await addFavorite(location);
      if (wasAdded) {
        await refreshFavorites();
      }
      return wasAdded;
    },
    [refreshFavorites],
  );

  // Remove favorite location
  const removeFavoriteLocation = useCallback(
    async (location: FavoriteLocation) => {
      await removeFavorite(location);
      await refreshFavorites();
    },
    [refreshFavorites],
  );

  // Move favorite up
  const moveFavoriteUpAction = useCallback(
    async (location: FavoriteLocation) => {
      await moveFavoriteUp(location);
      await refreshFavorites();
    },
    [refreshFavorites],
  );

  // Move favorite down
  const moveFavoriteDownAction = useCallback(
    async (location: FavoriteLocation) => {
      await moveFavoriteDown(location);
      await refreshFavorites();
    },
    [refreshFavorites],
  );

  // Get weather data for a favorite location
  const getFavoriteWeather = useCallback(
    (locationId: string, lat: number, lon: number) => {
      const key = LocationUtils.getLocationKey(locationId, lat, lon);
      return favoriteWeather[key];
    },
    [favoriteWeather],
  );

  // Get sun times for a favorite location
  const getFavoriteSunTimes = useCallback(
    (locationId: string, lat: number, lon: number) => {
      const key = LocationUtils.getLocationKey(locationId, lat, lon);
      return sunTimes[key];
    },
    [sunTimes],
  );

  // Check if favorite is loading
  const isFavoriteLoading = useCallback(
    (locationId: string, lat: number, lon: number) => {
      const key = LocationUtils.getLocationKey(locationId, lat, lon);
      return favoritesLoading[key] || false;
    },
    [favoritesLoading],
  );

  // Check if favorite has error
  const hasFavoriteError = useCallback(
    (locationId: string, lat: number, lon: number) => {
      const key = LocationUtils.getLocationKey(locationId, lat, lon);
      return favoriteErrors[key] || false;
    },
    [favoriteErrors],
  );

  return {
    // Favorites state
    favorites,
    favoritesLoaded,
    favoriteWeather,
    sunTimes,
    favoriteErrors,
    favoritesLoading,
    weatherDataInitialized,
    isInitialLoad,
    isBackgroundLoading,

    // Favorites actions
    addFavoriteLocation,
    removeFavoriteLocation,
    moveFavoriteUp: moveFavoriteUpAction,
    moveFavoriteDown: moveFavoriteDownAction,
    refreshFavorites,

    // Utility functions
    getFavoriteWeather,
    getFavoriteSunTimes,
    isFavoriteLoading,
    hasFavoriteError,
  };
}
