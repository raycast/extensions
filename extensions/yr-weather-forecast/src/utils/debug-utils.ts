import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  debugMode?: boolean;
}

/**
 * Debug utility for conditional console output
 * Only logs when debug mode is enabled in preferences
 */
export class DebugLogger {
  private static isDebugMode(): boolean {
    try {
      const preferences = getPreferenceValues<Preferences>();
      return preferences.debugMode === true;
    } catch {
      // Fallback to false if preferences can't be accessed
      return false;
    }
  }

  static log(...args: unknown[]): void {
    if (this.isDebugMode()) {
      console.log(...args);
    }
  }

  static error(...args: unknown[]): void {
    if (this.isDebugMode()) {
      console.error(...args);
    }
  }

  static warn(...args: unknown[]): void {
    if (this.isDebugMode()) {
      console.warn(...args);
    }
  }

  static info(...args: unknown[]): void {
    if (this.isDebugMode()) {
      console.info(...args);
    }
  }

  static debug(...args: unknown[]): void {
    if (this.isDebugMode()) {
      console.debug(...args);
    }
  }
}
