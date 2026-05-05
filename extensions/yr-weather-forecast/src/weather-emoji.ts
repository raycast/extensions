import type { TimeseriesEntry } from "./weather-client";
import { symbolCode } from "./utils-forecast";
import { symbolToEmoji, emojiForWeatherData } from "./utils/weather-symbols";

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
  return emojiForWeatherData(symbol);
}
