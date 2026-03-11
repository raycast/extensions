import type { TimeseriesEntry } from "./weather-client";
import { precipitationAmount, symbolCode } from "./utils-forecast";
import { formatPrecip, formatWindSpeed } from "./units";
import { symbolToEmoji } from "./utils/weather-symbols";
import { formatDate, formatTime as formatTimeUtil, getPeriodName } from "./utils/date-utils";
import { UI_THRESHOLDS } from "./config/weather-config";
import { TemperatureFormatter } from "./utils/weather-formatters";

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
 * Filter forecast series to a specific date with extended context
 * Handles timezone conversion between local date and UTC API data
 * Includes the last data point of the previous day and first data point of the next day
 * for a more complete visualization
 */
export function filterToDate(series: TimeseriesEntry[], targetDate: Date): TimeseriesEntry[] {
  // Coherent strategy:
  // - interpret the user's requested date in LOCAL time
  // - compare API timestamps by converting them to Date objects (which render in local time)
  // - avoid manual timezone offset math (error-prone around DST)
  const startLocal = new Date(targetDate);
  startLocal.setHours(0, 0, 0, 0);

  const endLocal = new Date(startLocal);
  endLocal.setDate(endLocal.getDate() + 1);

  const prevStartLocal = new Date(startLocal);
  prevStartLocal.setDate(prevStartLocal.getDate() - 1);

  const nextEndLocal = new Date(endLocal);
  nextEndLocal.setDate(nextEndLocal.getDate() + 1);

  const targetDayData = series.filter((s) => {
    const d = new Date(s.time);
    return d >= startLocal && d < endLocal;
  });

  const previousDayData = series.filter((s) => {
    const d = new Date(s.time);
    return d >= prevStartLocal && d < startLocal;
  });
  const lastPreviousDay = previousDayData.length > 0 ? previousDayData[previousDayData.length - 1] : null;

  const nextDayData = series.filter((s) => {
    const d = new Date(s.time);
    return d >= endLocal && d < nextEndLocal;
  });
  const firstNextDay = nextDayData.length > 0 ? nextDayData[0] : null;

  const result: TimeseriesEntry[] = [];
  if (lastPreviousDay) result.push(lastPreviousDay);
  result.push(...targetDayData);
  if (firstNextDay) result.push(firstNextDay);

  return result;
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
    const targets = UI_THRESHOLDS.REPRESENTATIVE_HOURS;
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
    parts.push(TemperatureFormatter.format(ts) ?? "");

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
