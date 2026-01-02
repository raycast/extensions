import { getPreferenceValues } from "@raycast/api";
import { convertTemperature, convertSpeed, convertPrecipitation } from "./config/weather-config";

export type Units = "metric" | "imperial";

export function getUnits(): Units {
  const prefs = getPreferenceValues<{ units?: Units }>();
  return (prefs.units as Units) ?? "metric";
}

export function getFeatureFlags(): { showWindDirection: boolean; showSunTimes: boolean } {
  const prefs = getPreferenceValues<{ showWindDirection?: boolean; showSunTimes?: boolean }>();
  return {
    showWindDirection: prefs.showWindDirection ?? true,
    showSunTimes: prefs.showSunTimes ?? true,
  };
}

export function formatTemperatureCelsius(celsius?: number, units: Units = getUnits()): string | undefined {
  if (typeof celsius !== "number") return undefined;
  const isImperial = units === "imperial";
  const temp = convertTemperature(celsius, isImperial);
  return `${Math.round(temp)} ${isImperial ? "°F" : "°C"}`;
}

export function formatWindSpeed(speedMs?: number, units: Units = getUnits()): string | undefined {
  if (typeof speedMs !== "number") return undefined;
  const isImperial = units === "imperial";
  const speed = convertSpeed(speedMs, isImperial);
  return `${Math.round(speed)} ${isImperial ? "mph" : "m/s"}`;
}

export function formatPrecip(mm?: number, units: Units = getUnits()): string | undefined {
  if (typeof mm !== "number") return undefined;
  const isImperial = units === "imperial";
  const precip = convertPrecipitation(mm, isImperial);

  if (isImperial) {
    const inchesText = precip.toFixed(2).replace(/\.?0+$/, "");
    return `${inchesText} in`;
  }
  return `${mm} mm`;
}
