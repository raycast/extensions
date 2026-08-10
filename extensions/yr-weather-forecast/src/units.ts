import { convertTemperature, convertSpeed, convertPrecipitation } from "./config/weather-config";
import { getAppPreferences } from "./preferences";

export type Units = "metric" | "imperial";

export function getUnits(): Units {
  const prefs = getAppPreferences();
  return (prefs.units as Units) ?? "metric";
}

export function getFeatureFlags(): { showWindDirection: boolean; showSunTimes: boolean } {
  const prefs = getAppPreferences();
  return {
    showWindDirection: prefs.showWindDirection ?? true,
    showSunTimes: prefs.showSunTimes ?? true,
  };
}

export function formatTemperatureCelsius(celsius?: number, units: Units = getUnits()): string | undefined {
  if (typeof celsius !== "number" || !Number.isFinite(celsius)) return undefined;
  const isImperial = units === "imperial";
  const temp = convertTemperature(celsius, isImperial);
  return `${Math.round(temp)} ${isImperial ? "°F" : "°C"}`;
}

export function formatWindSpeed(speedMs?: number, units: Units = getUnits()): string | undefined {
  if (typeof speedMs !== "number" || !Number.isFinite(speedMs)) return undefined;
  const isImperial = units === "imperial";
  const speed = convertSpeed(speedMs, isImperial);
  return `${Math.round(speed)} ${isImperial ? "mph" : "m/s"}`;
}

export function formatPrecip(mm?: number, units: Units = getUnits()): string | undefined {
  if (typeof mm !== "number" || !Number.isFinite(mm)) return undefined;
  const isImperial = units === "imperial";
  const precip = convertPrecipitation(mm, isImperial);

  if (isImperial) {
    const inchesText = precip.toFixed(2).replace(/\.?0+$/, "");
    return `${inchesText} in`;
  }
  return `${mm} mm`;
}
