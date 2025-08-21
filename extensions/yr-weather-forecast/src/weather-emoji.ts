import type { TimeseriesEntry } from "./weather-client";
import { symbolCode } from "./utils-forecast";

/**
 * Convert weather symbol to emoji string
 * Used in markdown tables and text displays
 */
export function symbolToEmoji(symbol?: string): string {
  if (!symbol) return "";
  const s = symbol.toLowerCase();
  if (s.includes("thunder")) return "⛈️";
  if (s.includes("sleet")) return "🌨️";
  if (s.includes("snow")) return "🌨️";
  if (s.includes("rain")) return s.includes("showers") ? "🌦️" : "🌧️";
  if (s.includes("fog")) return "🌫️";
  if (s.includes("partlycloudy")) return "🌤️";
  if (s.includes("cloudy")) return "☁️";
  if (s.includes("fair")) return s.includes("night") ? "🌙" : "🌤️";
  if (s.includes("clearsky")) return s.includes("night") ? "🌙" : "☀️";
  return "";
}

/**
 * Convert TimeseriesEntry to emoji string
 * Convenience function that extracts symbol first
 */
export function emojiForTs(ts: TimeseriesEntry): string {
  const symbol = symbolCode(ts);
  return symbolToEmoji(symbol);
}

/**
 * Convert TimeseriesEntry to Image.ImageLike for Raycast List icons
 * Returns emoji string that can be used as an icon
 */
export function iconForSymbol(ts: TimeseriesEntry | undefined): string | undefined {
  if (!ts) return undefined;
  const symbol = symbolCode(ts);
  if (!symbol) return undefined;

  const s = symbol.toLowerCase();
  if (s.includes("thunder")) return "⛈️";
  if (s.includes("sleet")) return "🌨️";
  if (s.includes("snow")) return "🌨️";
  if (s.includes("rain")) return s.includes("showers") ? "🌦️" : "🌧️";
  if (s.includes("fog")) return "🌫️";
  if (s.includes("partlycloudy")) return "🌤️";
  if (s.includes("cloudy")) return "☁️";
  if (s.includes("fair")) return s.includes("night") ? "🌙" : "🌤️";
  if (s.includes("clearsky")) return s.includes("night") ? "🌙" : "☀️";
  return "🌡️"; // Default temperature icon
}
