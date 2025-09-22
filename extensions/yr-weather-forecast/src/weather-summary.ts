import type { TimeseriesEntry } from "./weather-client";
import { symbolCode, precipitationAmount } from "./utils-forecast";
import { symbolToCondition } from "./utils/weather-symbols";
import { getPrecipitationChanceLevel } from "./config/weather-config";

export type WeatherSummary = {
  condition: string;
  precipitationChance: "none" | "low" | "medium" | "high";
  temperature: {
    min: number | undefined;
    max: number | undefined;
  };
};

/**
 * Get precipitation chance level based on intensity and coverage
 * Uses the centralized weather configuration system for thresholds
 */
function getPrecipitationChance(series: TimeseriesEntry[]): "none" | "low" | "medium" | "high" {
  if (series.length === 0) return "none";

  const precipAmounts = series
    .map((ts) => precipitationAmount(ts))
    .filter((amount): amount is number => amount !== undefined && amount > 0);

  if (precipAmounts.length === 0) return "none";

  const maxPrecip = Math.max(...precipAmounts);
  const precipHours = precipAmounts.length;
  const totalHours = series.length;
  const coverageRatio = precipHours / totalHours;

  // Use the centralized configuration system
  return getPrecipitationChanceLevel(maxPrecip, coverageRatio);
}

function getTemperatureRange(series: TimeseriesEntry[]): { min: number | undefined; max: number | undefined } {
  if (series.length === 0) return { min: undefined, max: undefined };

  const temps = series
    .map((ts) => ts.data?.instant?.details?.air_temperature)
    .filter((temp): temp is NonNullable<typeof temp> => temp !== undefined && Number.isFinite(temp as number))
    .map((temp) => temp as number); // Convert branded type to number for calculations

  if (temps.length === 0) return { min: undefined, max: undefined };

  return {
    min: Math.min(...temps),
    max: Math.max(...temps),
  };
}

function getDominantCondition(series: TimeseriesEntry[]): string {
  if (series.length === 0) return "No data";

  // Count occurrences of each condition type
  const conditionCounts: Record<string, number> = {};

  for (const ts of series) {
    const symbol = symbolCode(ts);
    if (!symbol) continue;

    const condition = symbolToCondition(symbol);
    conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
  }

  // Find the most common condition
  let dominantCondition = "Mixed conditions";
  let maxCount = 0;

  for (const [condition, count] of Object.entries(conditionCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantCondition = condition;
    }
  }

  return dominantCondition;
}

export function generateDaySummary(series: TimeseriesEntry[]): WeatherSummary {
  const condition = getDominantCondition(series);
  const precipitationChance = getPrecipitationChance(series);
  const temperature = getTemperatureRange(series);

  return {
    condition,
    precipitationChance,
    temperature,
  };
}

export function formatSummary(summary: WeatherSummary): string {
  const parts: string[] = [];

  // Add condition
  parts.push(summary.condition);

  // Add precipitation chance
  if (summary.precipitationChance !== "none") {
    const chanceText =
      summary.precipitationChance === "high" ? "high" : summary.precipitationChance === "medium" ? "medium" : "low";
    parts.push(`with a ${chanceText} chance of precipitation`);
  }

  // Add temperature range if available
  if (summary.temperature.min !== undefined && summary.temperature.max !== undefined) {
    const min = Math.round(summary.temperature.min);
    const max = Math.round(summary.temperature.max);
    if (min === max) {
      parts.push(`around ${min}°C`);
    } else {
      parts.push(`from ${min}°C to ${max}°C`);
    }
  }

  return parts.join(", ");
}
