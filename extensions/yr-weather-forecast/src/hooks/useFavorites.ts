import { useState, useEffect, useCallback } from "react";
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
import { buildGraphMarkdown } from "../graph";
import { getUIThresholds, getTimingThresholds } from "../config/weather-config";

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
  preWarmedGraphs: Record<string, string>;

  // Favorites actions
  addFavoriteLocation: (location: FavoriteLocation) => Promise<void>;
  removeFavoriteLocation: (location: FavoriteLocation) => Promise<void>;
  moveFavoriteUp: (location: FavoriteLocation) => Promise<void>;
  moveFavoriteDown: (location: FavoriteLocation) => Promise<void>;
  refreshFavorites: () => Promise<void>;

  // Utility functions
  isLocationFavorite: (locationId: string) => boolean;
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
  const [preWarmedGraphs, setPreWarmedGraphs] = useState<Record<string, string>>({});

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
      setFavoriteErrors({});
      setFavoritesLoading({});
      setWeatherDataInitialized(true); // No favorites to load, so we're "done"
      return;
    }

    let cancelled = false;
    setWeatherDataInitialized(false); // Starting fresh data load

    async function fetchAll() {
      // Reset states
      setFavoriteErrors({});

      // Mark all favorites as loading
      const loadingMap: Record<string, boolean> = {};
      favorites.forEach((fav) => {
        const key = LocationUtils.getLocationKey(fav.id, fav.lat, fav.lon);
        loadingMap[key] = true;
      });
      setFavoritesLoading(loadingMap);

      try {
        const entries = await Promise.all(
          favorites.map(async (fav) => {
            const key = LocationUtils.getLocationKey(fav.id, fav.lat, fav.lon);
            try {
              const ts = await getWeather(fav.lat, fav.lon);
              const sun = await getSunTimes(fav.lat, fav.lon).catch(() => ({}) as SunTimes);
              return [key, ts, sun] as const;
            } catch {
              // Immediately mark error so UI doesn't stay stuck in "Loading..."
              if (!cancelled) {
                setFavoriteErrors((prev) => ({ ...prev, [key]: true }));
                setFavoritesLoading((prev) => ({ ...prev, [key]: false }));
              }
              return [key, undefined, {} as SunTimes] as const;
            }
          }),
        );

        if (!cancelled) {
          // Set each entry individually to ensure React picks up the changes
          for (const [key, ts, sun] of entries) {
            if (ts) {
              setFavoriteWeather((prev) => ({ ...prev, [key]: ts }));

              // Pre-warm graph for this favorite
              try {
                const graphMarkdown = buildGraphMarkdown(
                  favorites.find((f) => LocationUtils.getLocationKey(f.id, f.lat, f.lon) === key)?.name || "Location",
                  [ts], // Single entry for favorites
                  getUIThresholds().DEFAULT_FORECAST_HOURS,
                  { title: "48h forecast", smooth: true },
                ).markdown;

                setPreWarmedGraphs((prev) => ({ ...prev, [key]: graphMarkdown }));
              } catch (err) {
                DebugLogger.error("Error pre-warming graph for favorite:", err);
              }
            }
            setSunTimes((prev) => ({ ...prev, [key]: sun }));
            // Mark as no longer loading
            setFavoritesLoading((prev) => ({ ...prev, [key]: false }));
          }

          // Add a small delay to ensure smooth transition without flashing
          setTimeout(() => {
            setWeatherDataInitialized(true);
            setIsInitialLoad(false); // Mark initial load as complete
          }, getTimingThresholds().COMPONENT_INIT_DELAY);
        }
      } catch (err) {
        DebugLogger.error("Error fetching favorites:", err);
        // Mark all as no longer loading on general error
        if (!cancelled) {
          setFavoritesLoading({});
          // Even on error, we're "done" trying - show with small delay
          setTimeout(() => {
            setWeatherDataInitialized(true);
            setIsInitialLoad(false); // Mark initial load as complete
          }, getTimingThresholds().COMPONENT_INIT_DELAY);
        }
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [favorites]);

  // Add favorite location
  const addFavoriteLocation = useCallback(async (location: FavoriteLocation) => {
    await addFavorite(location);
    await refreshFavorites();
  }, []);

  // Remove favorite location
  const removeFavoriteLocation = useCallback(async (location: FavoriteLocation) => {
    await removeFavorite(location);
    await refreshFavorites();
  }, []);

  // Move favorite up
  const moveFavoriteUpAction = useCallback(async (location: FavoriteLocation) => {
    await moveFavoriteUp(location);
    await refreshFavorites();
  }, []);

  // Move favorite down
  const moveFavoriteDownAction = useCallback(async (location: FavoriteLocation) => {
    await moveFavoriteDown(location);
    await refreshFavorites();
  }, []);

  // Refresh favorites from storage
  const refreshFavorites = useCallback(async () => {
    const favs = await getFavorites();
    setFavorites(favs);
  }, []);

  // Check if location is favorite
  const isLocationFavorite = useCallback(
    (locationId: string) => {
      return favorites.some((fav) => fav.id === locationId);
    },
    [favorites],
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
    preWarmedGraphs,

    // Favorites actions
    addFavoriteLocation,
    removeFavoriteLocation,
    moveFavoriteUp: moveFavoriteUpAction,
    moveFavoriteDown: moveFavoriteDownAction,
    refreshFavorites,

    // Utility functions
    isLocationFavorite,
    getFavoriteWeather,
    getFavoriteSunTimes,
    isFavoriteLoading,
    hasFavoriteError,
  };
}
