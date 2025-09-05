import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import ForecastView from "../forecast";
import LazyGraphView from "../components/lazy-graph";
import { getWeather } from "../weather-client";
import { TimeseriesEntry } from "../weather-client";
import { FavoriteLocation } from "../storage";
import { WeatherFormatters } from "./weather-formatters";

/**
 * Location utility functions to eliminate duplication
 */
export class LocationUtils {
  /**
   * Create consistent location actions for both search results and favorites
   */
  static createLocationActions(
    name: string,
    lat: number,
    lon: number,
    isFavorite: boolean,
    onFavoriteToggle: () => void,
    onShowWelcome?: () => void,
    targetDate?: Date,
  ) {
    return (
      <ActionPanel>
        <Action.Push
          title="Open Forecast"
          target={
            <ForecastView
              name={name}
              lat={lat}
              lon={lon}
              onShowWelcome={onShowWelcome}
              targetDate={targetDate?.toISOString().split("T")[0]}
            />
          }
        />
        <Action
          title="Show Current Weather"
          onAction={async () => {
            try {
              const ts: TimeseriesEntry = await getWeather(lat, lon);
              await showToast({
                style: Toast.Style.Success,
                title: `Now at ${name}`,
                message: WeatherFormatters.formatWeatherToast(ts),
              });
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed to load weather",
                message: String((error as Error)?.message ?? error),
              });
            }
          }}
        />
        <Action.Push
          title="Open Graph"
          icon={Icon.BarChart}
          target={<LazyGraphView name={name} lat={lat} lon={lon} onShowWelcome={onShowWelcome} />}
        />
        {isFavorite ? (
          <Action
            title="Remove from Favorites"
            icon={Icon.StarDisabled}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={onFavoriteToggle}
          />
        ) : (
          <Action
            title="Add to Favorites"
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={onFavoriteToggle}
          />
        )}
      </ActionPanel>
    );
  }

  /**
   * Create a FavoriteLocation object from search results
   */
  static createFavoriteFromSearchResult(id: string, displayName: string, lat: number, lon: number): FavoriteLocation {
    return { id, name: displayName, lat, lon };
  }

  /**
   * Get location key consistently across the app
   */
  static getLocationKey(id: string | undefined, lat: number, lon: number): string {
    return id ?? `${lat},${lon}`;
  }

  /**
   * Format location coordinates consistently
   */
  static formatCoordinates(lat: number, lon: number): string {
    return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  }
}
