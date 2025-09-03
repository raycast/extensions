import { getPreferenceValues } from "@raycast/api";

export type Units = "metric" | "imperial";

export function getUnits(): Units {
  const prefs = getPreferenceValues<Preferences.Yr>();
  return (prefs.units as Units) ?? "metric";
}

export function getFeatureFlags(): { showWindDirection: boolean; showSunTimes: boolean } {
  const prefs = getPreferenceValues<Preferences.Yr>();
  return {
    showWindDirection: prefs.showWindDirection ?? true,
    showSunTimes: prefs.showSunTimes ?? true,
  };
}

export function formatTemperatureCelsius(celsius?: number, units: Units = getUnits()): string | undefined {
  if (typeof celsius !== "number") return undefined;
  if (units === "imperial") {
    const f = celsius * (9 / 5) + 32;
    return `${Math.round(f)} °F`;
  }
  return `${Math.round(celsius)} °C`;
}

export function formatWindSpeed(speedMs?: number, units: Units = getUnits()): string | undefined {
  if (typeof speedMs !== "number") return undefined;
  if (units === "imperial") {
    const mph = speedMs * 2.236936;
    return `${Math.round(mph)} mph`;
  }
  return `${Math.round(speedMs)} m/s`;
}

export function formatPrecip(mm?: number, units: Units = getUnits()): string | undefined {
  if (typeof mm !== "number") return undefined;
  if (units === "imperial") {
    const inches = mm / 25.4;
    const inchesText = inches.toFixed(2).replace(/\.?0+$/, "");
    return `${inchesText} in`;
  }
  return `${mm} mm`;
}
