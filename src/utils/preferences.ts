import { getPreferenceValues } from "@raycast/api";

export function getPreferences() {
  return getPreferenceValues();
}

export function sanitizeUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smh])$/);
  if (!match) {
    return 300; // 5 minutes
  }

  const [, value, unit] = match;
  const seconds = parseInt(value || "0", 10);

  switch (unit) {
    case "s":
      return seconds;
    case "m":
      return seconds * 60;
    case "h":
      return seconds * 3600;
    default:
      return 300; // Default to 5 minutes for unknown units
  }
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  } else {
    return `${Math.floor(seconds / 3600)}h`;
  }
}

export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getConnectionTimeout(): number {
  const preferences = getPreferences();
  const timeout = parseInt(preferences.connectionTimeout, 10);
  const value = isNaN(timeout) ? 10 : timeout;
  return Math.max(1, Math.min(value, 60)); // Ensure timeout is between 1 and 60 seconds
}
