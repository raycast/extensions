import type { TimeseriesEntry } from "./weather-client";
import { precipitationAmount, symbolCode } from "./utils-forecast";
import { formatPrecip, formatTemperatureCelsius, formatWindSpeed } from "./units";
import { symbolToEmoji } from "./utils/weather-symbols";
import { formatDate, formatTime as formatTimeUtil, getPeriodName } from "./utils/date-utils";

/**
 * Convert wind direction degrees to compass direction with arrow
 */
export function directionFromDegrees(degrees: number): { arrow: string; name: string } {
  const d = ((degrees % 360) + 360) % 360;
  const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"] as const;
  const index = Math.round(d / 45) % 8;
  return { arrow: arrows[index], name: names[index] };
}

/**
 * Format temperature from TimeseriesEntry
 */
export function formatTemp(ts: TimeseriesEntry | undefined): string | undefined {
  if (!ts) return undefined;
  const details = ts?.data?.instant?.details ?? {};
  return formatTemperatureCelsius(details.air_temperature);
}

/**
 * Filter forecast series to a specific date
 */
export function filterToDate(series: TimeseriesEntry[], targetDate: Date): TimeseriesEntry[] {
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return series.filter((s) => {
    const d = new Date(s.time);
    const local = new Date(d);
    local.setHours(0, 0, 0, 0);
    return local.getTime() === target.getTime();
  });
}

/**
 * Group forecast series by day
 */
export function groupByDay(series: TimeseriesEntry[]): Record<string, TimeseriesEntry[]> {
  return series.reduce<Record<string, TimeseriesEntry[]>>((acc, ts) => {
    const day = formatDate(ts.time, "FULL_DATE");
    (acc[day] ||= []).push(ts);
    return acc;
  }, {});
}

/**
 * Get period name from hour (Night, Morning, Afternoon, Evening)
 * @deprecated Use getPeriodName from ./utils/date-utils instead
 */
export function periodNameFromHour(hour: number): "Night" | "Morning" | "Afternoon" | "Evening" {
  return getPeriodName(hour);
}

/**
 * Format time from ISO string
 * @deprecated Use formatTime from ./utils/date-utils instead
 */
export function formatTime(iso: string): string {
  return formatTimeUtil(iso, "STANDARD");
}

/**
 * Reduce forecast to representative day periods (3, 9, 15, 21 hours)
 */
export function reduceToDayPeriods(series: TimeseriesEntry[], maxDays: number): TimeseriesEntry[] {
  const byDay = groupByDay(series);
  const dayKeys = Object.keys(byDay).slice(0, maxDays);
  const result: TimeseriesEntry[] = [];
  for (const day of dayKeys) {
    const entries = byDay[day];
    // Index by hour for quick lookup
    const byHour: Record<number, TimeseriesEntry> = {};
    for (const ts of entries) byHour[new Date(ts.time).getHours()] = ts;
    // Target representative hours: 03, 09, 15, 21
    const targets = [3, 9, 15, 21];
    for (const target of targets) {
      let chosen: TimeseriesEntry | undefined = undefined;
      for (let delta = 0; delta <= 2 && !chosen; delta++) {
        chosen = byHour[target] ?? byHour[target - delta] ?? byHour[target + delta];
      }
      if (chosen) result.push(chosen);
    }
  }
  return result;
}

/**
 * Build markdown table from weather data
 */
export function buildWeatherTable(
  series: TimeseriesEntry[],
  options: {
    showDirection?: boolean;
    showPeriod?: boolean;
    columns?: string[];
    headers?: string[];
  } = {},
): string {
  const { showDirection = true, showPeriod = false, columns, headers } = options;

  if (series.length === 0) return "_No data available_";

  const sortedSeries = series.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  // Default columns
  const defaultColumns = showPeriod
    ? ["Period", "Weather", "Temp", "Wind", "Dir", "Precip"]
    : ["Time", "Weather", "Temp", "Wind", "Dir", "Precip"];

  const finalColumns = columns || defaultColumns;
  const finalHeaders = headers || finalColumns;

  const rows = sortedSeries.map((ts) => {
    const parts: string[] = [];

    // Time/Period column
    if (showPeriod) {
      const date = new Date(ts.time);
      parts.push(periodNameFromHour(date.getHours()));
    } else {
      parts.push(formatTime(ts.time));
    }

    // Weather column
    const symbol = symbolCode(ts);
    const emoji = symbolToEmoji(symbol);
    parts.push(emoji);

    // Temperature column
    parts.push(formatTemp(ts) ?? "");

    // Wind column
    const details = ts?.data?.instant?.details ?? {};
    parts.push(formatWindSpeed(details.wind_speed) ?? "");

    // Direction column
    if (showDirection) {
      const dir =
        typeof details.wind_from_direction === "number"
          ? (() => {
              const d = directionFromDegrees(details.wind_from_direction);
              return `${d.arrow} ${d.name}`;
            })()
          : "";
      parts.push(dir);
    }

    // Precipitation column
    const precip = precipitationAmount(ts);
    parts.push(formatPrecip(precip) ?? "");

    return parts.join(" | ");
  });

  const headerRow = finalHeaders.join(" | ");
  const separator = finalHeaders.map(() => "---").join("|");

  return [headerRow, separator, ...rows, ""].join("\n");
}
