import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  piholeUrl: string;
  apiToken: string;
  defaultDisableTime: string;
  connectionTimeout: string;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function sanitizeUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smh])$/);
  if (!match) {
    throw new Error(
      `Invalid duration format: ${duration}. Use format like 5m, 1h, 30s`,
    );
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
      throw new Error(`Invalid duration unit: ${unit}`);
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
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getConnectionTimeout(): number {
  const preferences = getPreferences();
  const timeout = parseInt(preferences.connectionTimeout, 10);
  return isNaN(timeout) ? 10 : timeout;
}
