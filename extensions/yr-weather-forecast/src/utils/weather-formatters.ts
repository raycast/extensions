import { Image } from "@raycast/api";
import { TimeseriesEntry } from "../weather-client";
import { SunTimes } from "../sunrise-client";
import { formatPrecip, formatTemperatureCelsius, formatWindSpeed, getUnits, getFeatureFlags } from "../units";
import { precipitationAmount } from "../utils-forecast";
import { directionFromDegrees } from "../weather-utils";
import { formatTime } from "./date-utils";

/**
 * Consolidated temperature formatting utility
 * Single source of truth for temperature formatting from TimeseriesEntry
 */
export class TemperatureFormatter {
  /**
   * Format temperature from TimeseriesEntry
   * Consolidates the duplicate formatTemp functions across the codebase
   */
  static format(ts: TimeseriesEntry | undefined): string | undefined {
    if (!ts) return undefined;
    const details = ts?.data?.instant?.details ?? {};
    return formatTemperatureCelsius(details.air_temperature);
  }
}

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

    // Temperature - show if we have valid temperature data
    const temp = TemperatureFormatter.format(ts);
    if (temp && typeof details.air_temperature === "number") {
      acc.push({ tag: `🌡️ ${temp}`, tooltip: "Temperature" });
    }

    // Precipitation - show if we have valid precipitation data (including 0mm)
    const precip = precipitationAmount(ts);
    const p = formatPrecip(precip, units);
    if (p && typeof precip === "number") {
      acc.push({ tag: `☔ ${p}`, tooltip: "Precipitation" });
    }

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

    // Sun times - only show if we have valid sunrise/sunset data
    if (flags.showSunTimes && sun) {
      const sr = sun.sunrise ? new Date(sun.sunrise) : undefined;
      const ss = sun.sunset ? new Date(sun.sunset) : undefined;

      // Only show sunrise if it's a valid date
      if (sr && !isNaN(sr.getTime())) {
        acc.push({
          tag: `🌅 ${formatTime(sr, "MILITARY")}`,
          tooltip: "Sunrise",
        });
      }

      // Only show sunset if it's a valid date
      if (ss && !isNaN(ss.getTime())) {
        acc.push({
          tag: `🌇 ${formatTime(ss, "MILITARY")}`,
          tooltip: "Sunset",
        });
      }
    }

    return acc.length ? acc : undefined;
  }
}
