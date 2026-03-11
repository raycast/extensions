/**
 * Centralized date and time formatting utilities
 * This consolidates all date/time formatting logic into a single source of truth
 */

import { getClockFormat } from "../clock";

/**
 * Common date formatting options used throughout the application
 */
export const DATE_FORMATS = {
  // Short day format: "Mon, Jan 15"
  SHORT_DAY: {
    weekday: "short",
    month: "short",
    day: "numeric",
  } as const,

  // Long day format: "Monday, January 15"
  LONG_DAY: {
    weekday: "long",
    month: "long",
    day: "numeric",
  } as const,

  // Full date format: "Mon, Jan 15, 2024"
  FULL_DATE: {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  } as const,

  // Month and day only: "Jan 15"
  MONTH_DAY: {
    month: "short",
    day: "numeric",
  } as const,

  // Weekday only: "Monday"
  WEEKDAY_ONLY: {
    weekday: "long",
  } as const,

  // Short weekday: "Mon"
  SHORT_WEEKDAY: {
    weekday: "short",
  } as const,
} as const;

/**
 * Common time formatting options used throughout the application
 */
export const TIME_FORMATS = {
  // Standard time: "2:30 PM"
  STANDARD: {
    hour: "2-digit",
    minute: "2-digit",
  } as const,

  // 24-hour time: "14:30"
  MILITARY: {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  } as const,

  // Hour only (24-hour): "14"
  HOUR_ONLY: {
    hour: "2-digit",
    hour12: false,
  } as const,
} as const;

/**
 * Format a Date object as a local YYYY-MM-DD string.
 * Avoids UTC conversion artifacts from toISOString().
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string as local midnight.
 * Avoids Date constructor UTC parsing for date-only strings.
 */
export function parseLocalDateString(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    throw new Error(`Invalid local date string: ${dateStr}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day);
}

/**
 * Format a date using predefined format options
 */
export function formatDate(date: Date | string, format: keyof typeof DATE_FORMATS): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString(undefined, DATE_FORMATS[format]);
}

/**
 * Format a time using predefined format options
 * Respects user's clock format preference (12h/24h)
 */
export function formatTime(date: Date | string, format: keyof typeof TIME_FORMATS): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const clockFormat = getClockFormat();

  // Get the base format options
  const formatOptions = { ...TIME_FORMATS[format] };

  // Override hour12 based on user preference for STANDARD and MILITARY formats
  if (format === "STANDARD" || format === "MILITARY") {
    (formatOptions as Intl.DateTimeFormatOptions).hour12 = clockFormat === "12h";
  }

  return dateObj.toLocaleTimeString(undefined, formatOptions);
}

/**
 * Format a date with custom options
 */
export function formatDateCustom(date: Date | string, options: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString(undefined, options);
}

/**
 * Format a time with custom options
 */
export function formatTimeCustom(date: Date | string, options: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleTimeString(undefined, options);
}

/**
 * Get period name from hour (Night, Morning, Afternoon, Evening)
 * Moved from weather-utils.ts to centralize date-related logic
 */
export function getPeriodName(hour: number): "Night" | "Morning" | "Afternoon" | "Evening" {
  if (hour < 6) return "Night";
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is tomorrow
 */
export function isTomorrow(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    dateObj.getDate() === tomorrow.getDate() &&
    dateObj.getMonth() === tomorrow.getMonth() &&
    dateObj.getFullYear() === tomorrow.getFullYear()
  );
}

/**
 * Get relative date string (Today, Tomorrow, or formatted date)
 */
export function getRelativeDateString(date: Date | string): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return formatDate(date, "FULL_DATE");
}

/**
 * Format time range between two dates
 * Respects user's clock format preference (12h/24h)
 */
export function formatTimeRange(
  start: Date | string,
  end: Date | string,
  timeFormat: keyof typeof TIME_FORMATS = "STANDARD",
): string {
  const startTime = formatTime(start, timeFormat);
  const endTime = formatTime(end, timeFormat);
  return `${startTime} - ${endTime}`;
}

/**
 * Format a timestamp for "last updated" display
 * Shows relative time if recent (e.g., "5 minutes ago") or formatted date/time if older
 */
export function formatLastUpdated(timestamp: string | Date): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Show relative time for recent updates (using abbreviations)
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  // For older updates, show formatted date and time
  const clockFormat = getClockFormat();
  const timeFormat = clockFormat === "12h" ? "STANDARD" : "MILITARY";
  const timeStr = formatTime(date, timeFormat);

  if (isToday(date)) {
    return `Today at ${timeStr}`;
  } else if (isTomorrow(date)) {
    return `Tomorrow at ${timeStr}`;
  } else {
    const dateStr = formatDate(date, "SHORT_DAY");
    return `${dateStr} at ${timeStr}`;
  }
}
