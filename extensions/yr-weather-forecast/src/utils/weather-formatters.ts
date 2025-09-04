import { Image } from "@raycast/api";
import { TimeseriesEntry } from "../weather-client";
import { SunTimes } from "../sunrise-client";
import { formatPrecip, formatTemperatureCelsius, formatWindSpeed, getUnits, getFeatureFlags } from "../units";
import { precipitationAmount } from "../utils-forecast";
import { directionFromDegrees } from "../weather-utils";
import { formatTime } from "./date-utils";

/**
 * Consolidated weather formatting utilities to eliminate duplication
 */
export class WeatherFormatters {
  /**
   * Format weather data for toast messages
   */
  static formatWeatherToast(ts: TimeseriesEntry): string {
    const details = ts?.data?.instant?.details ?? {};
    const temp = formatTemperatureCelsius(details.air_temperature) ?? "N/A";
    const windSpeed = formatWindSpeed(details.wind_speed);
    const windDir =
      typeof details.wind_from_direction === "number"
        ? (() => {
            const d = directionFromDegrees(details.wind_from_direction);
            return `${d.arrow} ${d.name}`;
          })()
        : undefined;
    const precip = precipitationAmount(ts);
    const precipText = formatPrecip(precip);

    return [temp, windSpeed && `wind ${windSpeed}`, windDir && `from ${windDir}`, precipText && `precip ${precipText}`]
      .filter(Boolean)
      .join("  •  ");
  }

  /**
   * Format accessories for weather display
   */
  static formatAccessories(
    ts: TimeseriesEntry | undefined,
    sun?: SunTimes,
  ): Array<{ tag?: string | Image; text?: string; tooltip?: string }> | undefined {
    const details = ts?.data?.instant?.details ?? {};
    const acc: Array<{ tag?: string | Image; text?: string; tooltip?: string }> = [];
    const units = getUnits();
    const flags = getFeatureFlags();

    // Wind speed - only show if we have meaningful wind data (> 0)
    const wind = formatWindSpeed(details.wind_speed, units);
    if (wind && details.wind_speed && details.wind_speed > 0) {
      acc.push({ tag: `💨 ${wind}`, tooltip: "Wind" });
    }

    // Wind direction - only show if we have meaningful wind speed AND direction
    if (
      flags.showWindDirection &&
      typeof details.wind_from_direction === "number" &&
      details.wind_speed &&
      details.wind_speed > 0
    ) {
      const dir = directionFromDegrees(details.wind_from_direction);
      acc.push({
        tag: `🧭 ${dir.arrow} ${dir.name}`,
        tooltip: `Direction ${Math.round(details.wind_from_direction)}°`,
      });
    }

    // Precipitation - show if we have valid precipitation data (including 0mm)
    const precip = precipitationAmount(ts);
    const p = formatPrecip(precip, units);
    if (p && typeof precip === "number") {
      acc.push({ tag: `☔ ${p}`, tooltip: "Precipitation" });
    }

    // Sun times - only show if we have valid sunrise/sunset data
    if (flags.showSunTimes && sun) {
      const sr = sun.sunrise ? new Date(sun.sunrise) : undefined;
      const ss = sun.sunset ? new Date(sun.sunset) : undefined;

      // Only show sunrise if it's a valid date and not in the past relative to now
      if (sr && !isNaN(sr.getTime())) {
        acc.push({
          tag: `🌅 ${formatTime(sr, "MILITARY")}`,
          tooltip: "Sunrise",
        });
      }

      // Only show sunset if it's a valid date and not in the past relative to now
      if (ss && !isNaN(ss.getTime())) {
        acc.push({
          tag: `🌇 ${formatTime(ss, "MILITARY")}`,
          tooltip: "Sunset",
        });
      }
    }

    return acc.length ? acc : undefined;
  }

  /**
   * Format temperature from TimeseriesEntry
   */
  static formatTemp(ts: TimeseriesEntry | undefined): string | undefined {
    if (!ts) return undefined;
    const details = ts?.data?.instant?.details ?? {};
    return formatTemperatureCelsius(details.air_temperature);
  }
}
