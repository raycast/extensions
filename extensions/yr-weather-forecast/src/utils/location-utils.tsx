import { Action, ActionPanel, showToast, Toast, Icon } from "@raycast/api";
import { LazyForecastView } from "../components/lazy-forecast";
import { getWeather } from "../weather-client";
import { TimeseriesEntry } from "../weather-client";
import { FavoriteLocation } from "../storage";
import { WeatherFormatters } from "./weather-formatters";
import { FavoriteToggleAction } from "../components/FavoriteToggleAction";
import { LocationResult } from "../location-search";

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
    onFavoriteChange?: () => void,
    preCachedGraph?: string,
  ) {
    return (
      <ActionPanel>
        <Action.Push
          title="Open Forecast"
          target={
            <LazyForecastView
              name={name}
              lat={lat}
              lon={lon}
              preCachedGraph={preCachedGraph}
              onShowWelcome={onShowWelcome}
              targetDate={targetDate?.toISOString().split("T")[0]}
              onFavoriteChange={onFavoriteChange}
            />
          }
        />

        {/* Date-specific forecast actions - single day view for specific dates */}
        {targetDate && (
          <>
            <Action.Push
              title="View Tomorrow's Weather"
              icon={Icon.Clock}
              target={
                <LazyForecastView
                  name={name}
                  lat={lat}
                  lon={lon}
                  preCachedGraph={preCachedGraph}
                  onShowWelcome={onShowWelcome}
                  targetDate={targetDate.toISOString().split("T")[0]}
                  onFavoriteChange={onFavoriteChange}
                />
              }
            />
            <Action.Push
              title="View Full Forecast"
              icon={Icon.Calendar}
              target={
                <LazyForecastView
                  name={name}
                  lat={lat}
                  lon={lon}
                  preCachedGraph={preCachedGraph}
                  onShowWelcome={onShowWelcome}
                  onFavoriteChange={onFavoriteChange}
                />
              }
            />
          </>
        )}

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
        <FavoriteToggleAction isFavorite={isFavorite} onToggle={onFavoriteToggle} />
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

  /**
   * Calculate a precision score for location sorting
   * Higher scores indicate more precise/specific locations
   */
  static calculateLocationPrecision(location: LocationResult): number {
    const { addresstype, type, class: osmClass, address } = location;

    // Base score starts at 0
    let score = 0;

    // Address type scoring (more specific = higher score)
    switch (addresstype) {
      case "house":
        score += 100;
        break;
      case "building":
        score += 90;
        break;
      case "street":
        score += 80;
        break;
      case "neighbourhood":
        score += 70;
        break;
      case "suburb":
        score += 60;
        break;
      case "city":
        score += 50;
        break;
      case "town":
        score += 45;
        break;
      case "village":
        score += 40;
        break;
      case "hamlet":
        score += 35;
        break;
      case "municipality":
        score += 20;
        break;
      case "county":
        score += 10;
        break;
      case "state":
        score += 5;
        break;
      case "country":
        score += 1;
        break;
      default:
        score += 30;
        break; // Unknown types get medium score
    }

    // OSM class and type adjustments
    if (osmClass === "place") {
      // Places are generally more specific than boundaries
      score += 10;
    } else if (osmClass === "boundary" && type === "administrative") {
      // Administrative boundaries are less specific
      score -= 5;
    }

    // Bonus for having specific address components
    if (address) {
      if (address.postcode) score += 5; // Has postal code = more specific
      if (address.city && address.municipality && address.city !== address.municipality) {
        score += 3; // City within municipality = more specific
      }
    }

    return score;
  }

  /**
   * Sort locations by precision (most specific first)
   */
  static sortLocationsByPrecision(locations: LocationResult[]): LocationResult[] {
    return [...locations].sort((a, b) => {
      const scoreA = LocationUtils.calculateLocationPrecision(a);
      const scoreB = LocationUtils.calculateLocationPrecision(b);

      // Higher score first (more precise)
      return scoreB - scoreA;
    });
  }

  /**
   * Get appropriate emoji for location type
   */
  static getLocationEmoji(location: LocationResult): string {
    const { addresstype, type, class: osmClass } = location;

    // Use addresstype as primary indicator, fall back to type/class
    const locationType = addresstype || type;

    switch (locationType) {
      case "house":
      case "building":
        return "🏠";

      case "neighbourhood":
      case "suburb":
        return "🏘️";

      case "city":
        return "🏙️";

      case "town":
        return "🏘️";

      case "village":
        return "🏘️";

      case "hamlet":
        return "🏘️";

      case "municipality":
        return "🏛️";

      case "county":
      case "state":
        return "🗺️";

      case "country":
        return "🌍";

      default:
        // Fallback based on OSM class/type
        if (osmClass === "place") {
          return "📍";
        } else if (osmClass === "boundary" && type === "administrative") {
          return "🏛️";
        } else {
          return "📍";
        }
    }
  }

  /**
   * Format location name concisely using structured address data
   * Creates shorter, more user-friendly display names
   */
  static formatLocationName(location: LocationResult): string {
    const { address, addresstype, type, class: osmClass } = location;

    if (!address) {
      return location.displayName;
    }

    const { city, town, municipality, county, state, country } = address;

    // Determine the primary name based on address type and available data
    const primaryName = city || town || municipality;

    if (!primaryName) {
      return location.displayName;
    }

    // Add type qualifier for administrative areas to distinguish them
    let typeQualifier = "";
    if (addresstype === "municipality" || (osmClass === "boundary" && type === "administrative")) {
      typeQualifier = " Municipality";
    } else if (addresstype === "city" && municipality && municipality !== primaryName) {
      // For cities, show the municipality if it's different
      typeQualifier = `, ${municipality}`;
    }

    // Build the concise name
    let conciseName = primaryName + typeQualifier;

    // Add regional context (county/state)
    const region = county || state;
    if (region && region !== primaryName) {
      conciseName += `, ${region}`;
    }

    // Add country
    if (country) {
      conciseName += `, ${country}`;
    }

    return conciseName;
  }
}
