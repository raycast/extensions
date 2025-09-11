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
