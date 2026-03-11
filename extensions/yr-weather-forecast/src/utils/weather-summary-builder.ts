import { TimeseriesEntry } from "../weather-client";
import { formatTemperatureCelsius, formatPrecip } from "../units";
import { formatTime } from "./date-utils";
import { precipitationAmount } from "../utils-forecast";
import { formatLastUpdated } from "./date-utils";
import { SunTimes } from "../sunrise-client";

/**
 * Analyze data coverage quality and detect issues
 * Returns a warning string if data quality issues are detected
 */
export function analyzeDataCoverage(displaySeries: TimeseriesEntry[]): string | null {
  if (displaySeries.length < 2) return null;

  const firstTime = new Date(displaySeries[0].time);
  const lastTime = new Date(displaySeries[displaySeries.length - 1].time);
  // Use local hours for user-facing coverage windows.
  // Avoid manual timezone offset math (breaks around DST and can flip direction).
  const startHour = firstTime.getHours();
  const endHour = lastTime.getHours();

  // Calculate actual hours covered
  const actualHoursCovered = Math.round((lastTime.getTime() - firstTime.getTime()) / (1000 * 60 * 60));

  // Check for data quality issues
  const issues: string[] = [];

  // 1. Check for resolution changes (hourly -> 6-hourly -> 12-hourly)
  const intervals = calculateIntervals(displaySeries);
  if (intervals.hasResolutionChange) {
    issues.push(`${intervals.primaryInterval}h→${intervals.secondaryInterval}h`);
  }

  // 2. Check for data gaps (missing expected hourly data)
  const gaps = detectDataGaps(displaySeries);
  if (gaps.length > 0) {
    issues.push(`${gaps.length} gap${gaps.length === 1 ? "" : "s"}`);
  }

  // 3. Check for incomplete forecast data
  const incompleteData = detectIncompleteForecasts(displaySeries);
  if (incompleteData.length > 0) {
    issues.push(`${incompleteData.length} incomplete`);
  }

  // 4. Check for very limited coverage (less than 6 hours for a full day search)
  if (actualHoursCovered < 6) {
    issues.push(`${actualHoursCovered}h coverage`);
  }

  // Only show warning if there are actual data quality issues
  if (issues.length > 0) {
    return `${startHour.toString().padStart(2, "0")}:00-${endHour.toString().padStart(2, "0")}:00 (${issues.join(", ")})`;
  }

  return null;
}

/**
 * Calculate time intervals between data points to detect resolution changes
 */
function calculateIntervals(series: TimeseriesEntry[]): {
  hasResolutionChange: boolean;
  primaryInterval: number;
  secondaryInterval: number;
} {
  if (series.length < 3) return { hasResolutionChange: false, primaryInterval: 1, secondaryInterval: 1 };

  const intervals: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = new Date(series[i - 1].time);
    const curr = new Date(series[i].time);
    const intervalHours = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60));
    intervals.push(intervalHours);
  }

  // Find the most common interval (primary) and any different interval (secondary)
  const intervalCounts = intervals.reduce(
    (acc, interval) => {
      acc[interval] = (acc[interval] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  const sortedIntervals = Object.entries(intervalCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([interval]) => parseInt(interval));

  const primaryInterval = sortedIntervals[0];
  const secondaryInterval = sortedIntervals[1];

  // Consider it a resolution change if there's a significant secondary interval
  // and it represents a meaningful change (e.g., 1h -> 6h, not 1h -> 2h)
  const hasResolutionChange = Boolean(
    secondaryInterval &&
      secondaryInterval > primaryInterval &&
      secondaryInterval >= 3 && // Only consider significant changes (3+ hours)
      intervalCounts[secondaryInterval] >= 1,
  ); // At least one occurrence

  return { hasResolutionChange, primaryInterval, secondaryInterval };
}

/**
 * Detect gaps in expected hourly data
 */
function detectDataGaps(series: TimeseriesEntry[]): number[] {
  const gaps: number[] = [];

  for (let i = 1; i < series.length; i++) {
    const prev = new Date(series[i - 1].time);
    const curr = new Date(series[i].time);
    const expectedInterval = 1; // Expected hourly data
    const actualInterval = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60));

    // Only consider significant gaps (3+ hours) as problematic
    if (actualInterval > expectedInterval + 2) {
      // Allow 2 hour tolerance
      gaps.push(actualInterval - expectedInterval);
    }
  }

  return gaps;
}

/**
 * Detect incomplete forecast data (missing next_1_hours, next_6_hours, etc.)
 */
function detectIncompleteForecasts(series: TimeseriesEntry[]): number[] {
  const incomplete: number[] = [];

  for (let i = 0; i < series.length; i++) {
    const entry = series[i];
    const hasNext1h = entry.data.next_1_hours?.summary || entry.data.next_1_hours?.details;
    const hasNext6h = entry.data.next_6_hours?.summary || entry.data.next_6_hours?.details;
    const hasNext12h = entry.data.next_12_hours?.summary || entry.data.next_12_hours?.details;

    // Check if forecast data is missing (should have at least one of these)
    if (!hasNext1h && !hasNext6h && !hasNext12h) {
      incomplete.push(i);
    }
  }

  return incomplete;
}

export type WeatherSummaryOptions = {
  showTemperature?: boolean;
  showPrecipitation?: boolean;
  showSunTimes?: boolean;
  showLastUpdated?: boolean;
  showDataCoverage?: boolean;
};

/**
 * Build a compact weather summary line with emojis and abbreviations
 * Used across all views (graph, 1-day, 9-day) for consistency
 */
export function buildCompactWeatherSummary(
  displaySeries: TimeseriesEntry[],
  sunByDate: Record<string, SunTimes>,
  metadata: { updated_at?: string; last_modified?: string; expires?: string } | null,
  options: WeatherSummaryOptions = {},
  targetDate?: string,
): string {
  const {
    showTemperature = true,
    showPrecipitation = true,
    showSunTimes = true,
    showLastUpdated = true,
    showDataCoverage = true,
  } = options;

  const summaryParts: string[] = [];

  // Temperature range
  if (showTemperature && displaySeries.length > 0) {
    const temps = displaySeries
      .map((s) => s.data?.instant?.details?.air_temperature)
      .filter((t): t is number => typeof t === "number" && Number.isFinite(t));

    if (temps.length > 0) {
      const minTemp = Math.min(...temps);
      const maxTemp = Math.max(...temps);
      const minText = formatTemperatureCelsius(minTemp);
      const maxText = formatTemperatureCelsius(maxTemp);
      summaryParts.push(`🌡️ ${minText}-${maxText}`);
    }
  }

  // Precipitation
  if (showPrecipitation && displaySeries.length > 0) {
    const precips = displaySeries
      .map((s) => precipitationAmount(s))
      .filter((p): p is number => typeof p === "number" && Number.isFinite(p));

    if (precips.length > 0) {
      const maxPrecip = Math.max(...precips);
      const precipText = formatPrecip(maxPrecip);
      summaryParts.push(`🌧️ ${precipText}`);
    }
  }

  // Sunrise/sunset (only for the first date in the forecast as daylight changes)
  if (showSunTimes && Object.keys(sunByDate).length > 0) {
    const firstDate = Object.keys(sunByDate)[0];
    const sunTimes = sunByDate[firstDate];
    if (sunTimes.sunrise || sunTimes.sunset) {
      const sunriseTime = sunTimes.sunrise ? formatTime(sunTimes.sunrise, "MILITARY") : "N/A";
      const sunsetTime = sunTimes.sunset ? formatTime(sunTimes.sunset, "MILITARY") : "N/A";
      summaryParts.push(`🌅 ${sunriseTime} 🌇 ${sunsetTime}`);
    }
  }

  // Add data coverage information for target dates (only show if there's limited data)
  if (showDataCoverage && targetDate && displaySeries.length > 0) {
    const coverageInfo = analyzeDataCoverage(displaySeries);
    if (coverageInfo) {
      summaryParts.push(`📊 ${coverageInfo}`);
    }
  }

  // Add last updated information
  if (showLastUpdated && (metadata?.updated_at || metadata?.last_modified)) {
    const lastUpdated = metadata.updated_at || metadata.last_modified;
    if (lastUpdated) {
      const formattedTime = formatLastUpdated(lastUpdated);
      summaryParts.push(`🕒 Updated: ${formattedTime}`);
    }
  }

  return summaryParts.length > 0 ? summaryParts.join(" • ") : "";
}
