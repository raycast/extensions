import type { TimeseriesEntry } from "./weather-client";
import { symbolCode, precipitationAmount } from "./utils-forecast";

export type WeatherSummary = {
  condition: string;
  precipitationChance: "none" | "low" | "medium" | "high";
  temperature: {
    min: number | undefined;
    max: number | undefined;
  };
};

// Maps MET symbol codes to human-readable conditions
const symbolToCondition: Record<string, string> = {
  // Clear sky
  clearsky_day: "Clear skies",
  clearsky_night: "Clear skies",
  clearsky_polartwilight: "Clear skies",

  // Fair
  fair_day: "Fair",
  fair_night: "Fair",
  fair_polartwilight: "Fair",

  // Partly cloudy
  partlycloudy_day: "Partly cloudy",
  partlycloudy_night: "Partly cloudy",
  partlycloudy_polartwilight: "Partly cloudy",

  // Cloudy
  cloudy: "Cloudy",

  // Rain
  rain: "Rainy",
  heavyrain: "Heavy rain",
  lightrain: "Light rain",
  showers_day: "Rain showers",
  showers_night: "Rain showers",
  heavyrainshowers_day: "Heavy rain showers",
  heavyrainshowers_night: "Heavy rain showers",
  lightrainshowers_day: "Light rain showers",
  lightrainshowers_night: "Light rain showers",

  // Snow
  snow: "Snowy",
  heavysnow: "Heavy snow",
  lightsnow: "Light snow",
  snowshowers_day: "Snow showers",
  snowshowers_night: "Snow showers",
  heavysnowshowers_day: "Heavy snow showers",
  heavysnowshowers_night: "Heavy snow showers",
  lightsnowshowers_day: "Light snow showers",
  lightsnowshowers_night: "Light snow showers",

  // Sleet
  sleet: "Sleet",
  heavysleet: "Heavy sleet",
  lightsleet: "Light sleet",
  sleetshowers_day: "Sleet showers",
  sleetshowers_night: "Sleet showers",
  heavysleetshowers_day: "Heavy sleet showers",
  heavysleetshowers_night: "Heavy sleet showers",
  lightsleetshowers_day: "Light sleet showers",
  lightsleetshowers_night: "Light sleet showers",

  // Thunder
  thunder: "Thunderstorms",
  heavyrainandthunder: "Heavy rain and thunder",
  rainandthunder: "Rain and thunder",
  heavyrainshowersandthunder_day: "Heavy rain showers and thunder",
  heavyrainshowersandthunder_night: "Heavy rain showers and thunder",
  rainshowersandthunder_day: "Rain showers and thunder",
  rainshowersandthunder_night: "Rain showers and thunder",

  // Fog
  fog: "Foggy",

  // Default fallback
  default: "Mixed conditions",
};

function getConditionFromSymbol(symbol: string): string {
  return symbolToCondition[symbol] || symbolToCondition.default;
}

function getPrecipitationChance(series: TimeseriesEntry[]): "none" | "low" | "medium" | "high" {
  if (series.length === 0) return "none";

  const precipAmounts = series
    .map((ts) => precipitationAmount(ts))
    .filter((amount): amount is number => amount !== undefined && amount > 0);

  if (precipAmounts.length === 0) return "none";

  const maxPrecip = Math.max(...precipAmounts);
  const precipHours = precipAmounts.length;
  const totalHours = series.length;

  // Consider both intensity and coverage
  if (maxPrecip > 5 || precipHours > totalHours * 0.7) return "high";
  if (maxPrecip > 2 || precipHours > totalHours * 0.4) return "medium";
  return "low";
}

function getTemperatureRange(series: TimeseriesEntry[]): { min: number | undefined; max: number | undefined } {
  if (series.length === 0) return { min: undefined, max: undefined };

  const temps = series
    .map((ts) => ts.data?.instant?.details?.air_temperature)
    .filter((temp): temp is number => temp !== undefined && Number.isFinite(temp));

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

    const condition = getConditionFromSymbol(symbol);
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
