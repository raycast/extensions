/**
 * Comprehensive weather symbol to emoji mapping
 * This consolidates all weather symbol parsing logic into a single source of truth
 */

export type WeatherSymbolType =
  | "thunder"
  | "sleet"
  | "snow"
  | "rain"
  | "fog"
  | "partlycloudy"
  | "cloudy"
  | "fair"
  | "clearsky";

export interface WeatherSymbolInfo {
  emoji: string;
  condition: string;
  description: string;
}

/**
 * Comprehensive mapping of weather symbols to emoji and descriptions
 */
export const WEATHER_SYMBOL_MAP: Record<WeatherSymbolType, WeatherSymbolInfo> = {
  thunder: {
    emoji: "⛈️",
    condition: "Thunderstorms",
    description: "Thunder and lightning",
  },
  sleet: {
    emoji: "🌨️",
    condition: "Sleet",
    description: "Mixed snow and rain",
  },
  snow: {
    emoji: "🌨️",
    condition: "Snowy",
    description: "Snow falling",
  },
  rain: {
    emoji: "🌧️",
    condition: "Rainy",
    description: "Rain falling",
  },
  fog: {
    emoji: "🌫️",
    condition: "Foggy",
    description: "Reduced visibility",
  },
  partlycloudy: {
    emoji: "🌤️",
    condition: "Partly cloudy",
    description: "Some clouds with sun",
  },
  cloudy: {
    emoji: "☁️",
    condition: "Cloudy",
    description: "Overcast conditions",
  },
  fair: {
    emoji: "🌤️",
    condition: "Fair",
    description: "Generally good weather",
  },
  clearsky: {
    emoji: "☀️",
    condition: "Clear skies",
    description: "No clouds",
  },
};

/**
 * Convert weather symbol to emoji string
 * Used in markdown tables and text displays
 */
export function symbolToEmoji(symbol?: string): string {
  if (!symbol) return "";

  const s = symbol.toLowerCase();

  // Check for specific patterns in order of specificity
  if (s.includes("thunder")) return WEATHER_SYMBOL_MAP.thunder.emoji;
  if (s.includes("sleet")) return WEATHER_SYMBOL_MAP.sleet.emoji;
  if (s.includes("snow")) return WEATHER_SYMBOL_MAP.snow.emoji;
  if (s.includes("rain")) {
    return s.includes("showers") ? "🌦️" : WEATHER_SYMBOL_MAP.rain.emoji;
  }
  if (s.includes("fog")) return WEATHER_SYMBOL_MAP.fog.emoji;
  if (s.includes("partlycloudy")) return WEATHER_SYMBOL_MAP.partlycloudy.emoji;
  if (s.includes("cloudy")) return WEATHER_SYMBOL_MAP.cloudy.emoji;
  if (s.includes("fair")) {
    return s.includes("night") ? "🌙" : WEATHER_SYMBOL_MAP.fair.emoji;
  }
  if (s.includes("clearsky")) {
    return s.includes("night") ? "🌙" : WEATHER_SYMBOL_MAP.clearsky.emoji;
  }

  return "";
}

/**
 * Convert weather symbol to human-readable condition
 * Used in weather summaries and descriptions
 */
export function symbolToCondition(symbol?: string): string {
  if (!symbol) return "Unknown";

  const s = symbol.toLowerCase();

  // Check for specific patterns in order of specificity
  if (s.includes("thunder")) return WEATHER_SYMBOL_MAP.thunder.condition;
  if (s.includes("sleet")) return WEATHER_SYMBOL_MAP.sleet.condition;
  if (s.includes("snow")) return WEATHER_SYMBOL_MAP.snow.condition;
  if (s.includes("rain")) {
    if (s.includes("showers")) return "Rain showers";
    if (s.includes("heavy")) return "Heavy rain";
    if (s.includes("light")) return "Light rain";
    return WEATHER_SYMBOL_MAP.rain.condition;
  }
  if (s.includes("fog")) return WEATHER_SYMBOL_MAP.fog.condition;
  if (s.includes("partlycloudy")) return WEATHER_SYMBOL_MAP.partlycloudy.condition;
  if (s.includes("cloudy")) return WEATHER_SYMBOL_MAP.cloudy.condition;
  if (s.includes("fair")) {
    return s.includes("night") ? "Fair night" : WEATHER_SYMBOL_MAP.fair.condition;
  }
  if (s.includes("clearsky")) {
    return s.includes("night") ? "Clear night" : WEATHER_SYMBOL_MAP.clearsky.condition;
  }

  return "Mixed conditions";
}

/**
 * Get emoji for TimeseriesEntry (convenience function)
 * Returns emoji string that can be used as an icon
 */
export function emojiForWeatherData(symbol?: string): string {
  const emoji = symbolToEmoji(symbol);
  return emoji || "🌡️"; // Default temperature icon
}
