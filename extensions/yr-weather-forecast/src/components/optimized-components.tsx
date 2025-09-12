import { memo, useMemo } from "react";
import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { TimeseriesEntry } from "../weather-client";
import { SunTimes } from "../sunrise-client";
import { iconForSymbol } from "../weather-emoji";
import { LocationUtils } from "../utils/location-utils";
import { getUIThresholds } from "../config/weather-config";
import { FavoriteToggleAction } from "./FavoriteToggleAction";
import { TemperatureFormatter } from "../utils/weather-formatters";

interface OptimizedFavoriteItemProps {
  favorite: {
    id: string;
    name: string;
    lat: number;
    lon: number;
  };
  weather?: TimeseriesEntry;
  sunTimes?: SunTimes;
  error: boolean;
  loading: boolean;
  preCachedGraph?: string;
  onOpenForecast: () => void;
  onShowCurrentWeather: () => void;
  onRemoveFavorite: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onShowWelcome: () => void;
}

/**
 * Optimized favorite item component with memoization
 */
export const OptimizedFavoriteItem = memo<OptimizedFavoriteItemProps>(
  ({
    favorite,
    weather,
    error,
    loading,
    onOpenForecast,
    onShowCurrentWeather,
    onRemoveFavorite,
    onMoveUp,
    onMoveDown,
    onShowWelcome,
  }) => {
    const key = LocationUtils.getLocationKey(favorite.id, favorite.lat, favorite.lon);

    // Memoize subtitle calculation
    const subtitle = useMemo(() => {
      if (!favorite.id) return "Invalid favorite";

      if (weather) {
        const temp = TemperatureFormatter.format(weather);
        return temp || "⚠️ Temperature unavailable";
      }

      if (error) {
        return "⚠️ Data fetch failed";
      }

      if (loading) {
        return "Loading weather...";
      }

      // Show coordinates when no weather data yet (lazy loading)
      return `${favorite.lat.toFixed(2)}, ${favorite.lon.toFixed(2)}`;
    }, [favorite.id, weather, error, loading, favorite.lat, favorite.lon]);

    // Memoize icon calculation
    const icon = useMemo(() => {
      if (!favorite.id) return "❌";

      if (weather) {
        return iconForSymbol(weather);
      }
      if (error) {
        return "⚠️";
      }
      if (loading) {
        return "⏳";
      }
      // Show neutral location icon when no weather data yet (lazy loading)
      return "📍";
    }, [favorite.id, weather, error, loading]);

    // Memoize accessories calculation
    const accessories = useMemo(() => {
      if (!favorite.id) return undefined;

      if (weather) {
        // This would need the formatAccessories function - simplified for now
        return [{ text: "Weather data available" }];
      }

      if (loading) {
        return [{ text: "Loading...", icon: Icon.ArrowClockwise }];
      }

      // No accessories when no weather data yet (lazy loading)
      return undefined;
    }, [favorite.id, weather, loading]);

    return (
      <List.Item
        key={key}
        title={favorite.name}
        subtitle={subtitle}
        icon={icon}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action title="Open Forecast" icon={Icon.Clock} onAction={onOpenForecast} />
            <Action title="Show Current Weather" icon={Icon.Wind} onAction={onShowCurrentWeather} />
            <FavoriteToggleAction isFavorite={true} onToggle={onRemoveFavorite} />
            <Action title="Move up" icon={Icon.ArrowUp} onAction={onMoveUp} />
            <Action title="Move Down" icon={Icon.ArrowDown} onAction={onMoveDown} />
            <Action title="Show Welcome Message" icon={Icon.Info} onAction={onShowWelcome} />
          </ActionPanel>
        }
      />
    );
  },
);

OptimizedFavoriteItem.displayName = "OptimizedFavoriteItem";

interface OptimizedSearchResultProps {
  location: {
    id: string;
    displayName: string;
    lat: number;
    lon: number;
  };
  isFavorite: boolean;
  targetDate?: Date;
  onToggleFavorite: () => void;
  onOpenForecast: () => void;
  onShowWelcome: () => void;
}

/**
 * Optimized search result item component with memoization
 */
export const OptimizedSearchResult = memo<OptimizedSearchResultProps>(
  ({ location, isFavorite, targetDate, onToggleFavorite, onOpenForecast, onShowWelcome }) => {
    // Memoize subtitle calculation
    const subtitle = useMemo(() => {
      if (targetDate) {
        return `Tap to view weather for ${targetDate.toLocaleDateString()}`;
      }
      return undefined;
    }, [targetDate]);

    // Memoize icon calculation
    const icon = useMemo(() => {
      return targetDate ? "📅" : LocationUtils.getLocationEmoji(location);
    }, [targetDate, location]);

    // Memoize accessories calculation
    const accessories = useMemo(() => {
      const coordinateText = targetDate
        ? targetDate.toLocaleDateString()
        : `${location.lat.toFixed(getUIThresholds().COORDINATE_PRECISION)}, ${location.lon.toFixed(getUIThresholds().COORDINATE_PRECISION)}`;

      return [
        {
          text: coordinateText,
          icon: targetDate ? Icon.Calendar : undefined,
        },
      ];
    }, [targetDate, location.lat, location.lon]);

    return (
      <List.Item
        key={location.id}
        title={LocationUtils.formatLocationName(location)}
        subtitle={subtitle}
        icon={icon}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action title="Open Forecast" onAction={onOpenForecast} />
            <FavoriteToggleAction isFavorite={isFavorite} onToggle={onToggleFavorite} />
            <Action title="Show Welcome Message" icon={Icon.Info} onAction={onShowWelcome} />
          </ActionPanel>
        }
      />
    );
  },
);

OptimizedSearchResult.displayName = "OptimizedSearchResult";
