export {
  PRECIPITATION_THRESHOLDS,
  PRECIPITATION_COVERAGE_THRESHOLDS,
  TEMPERATURE_THRESHOLDS,
  WIND_THRESHOLDS,
  UI_THRESHOLDS,
  GRAPH_THRESHOLDS,
  GRAPH_COLORS_LIGHT,
  GRAPH_COLORS_DARK,
  TIMING_THRESHOLDS,
  UNIT_CONVERSION,
  ERROR_THRESHOLDS,
  CACHE_THRESHOLDS,
} from "./weather-thresholds";

import {
  PRECIPITATION_THRESHOLDS,
  PRECIPITATION_COVERAGE_THRESHOLDS,
  UNIT_CONVERSION,
  GRAPH_COLORS_LIGHT,
  GRAPH_COLORS_DARK,
  type GraphColorPalette,
} from "./weather-thresholds";

export type { GraphColorPalette } from "./weather-thresholds";

export function getPrecipitationChanceLevel(
  maxIntensity: number,
  coverageRatio: number,
): "none" | "low" | "medium" | "high" {
  const { LIGHT, MODERATE, HEAVY } = PRECIPITATION_THRESHOLDS;
  const { LOW, MEDIUM, HIGH } = PRECIPITATION_COVERAGE_THRESHOLDS;

  if (maxIntensity === 0) return "none";
  if (maxIntensity > HEAVY || coverageRatio > HIGH) return "high";
  if (maxIntensity > MODERATE || coverageRatio > MEDIUM) return "medium";
  if (maxIntensity > LIGHT || coverageRatio > LOW) return "low";
  return "none";
}

export function convertTemperature(celsius: number, toImperial: boolean): number {
  if (!toImperial) return celsius;
  const { MULTIPLIER, OFFSET } = UNIT_CONVERSION.CELSIUS_TO_FAHRENHEIT;
  return celsius * MULTIPLIER + OFFSET;
}

export function convertSpeed(ms: number, toImperial: boolean): number {
  if (!toImperial) return ms;
  return ms * UNIT_CONVERSION.MS_TO_MPH;
}

export function convertPrecipitation(mm: number, toImperial: boolean): number {
  if (!toImperial) return mm;
  return mm * UNIT_CONVERSION.MM_TO_INCHES;
}

export function getGraphColors(appearance: string): GraphColorPalette {
  return appearance === "dark" ? GRAPH_COLORS_DARK : GRAPH_COLORS_LIGHT;
}
