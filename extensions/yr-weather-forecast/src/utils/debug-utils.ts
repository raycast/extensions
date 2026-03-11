import { getPreferenceValues } from "@raycast/api";

type DebugPreferences = {
  debugMode?: boolean;
};

// Evaluated once at module load. Raycast extensions are short-lived processes,
// so a preference change takes effect on the next launch — which is acceptable.
const DEBUG_ENABLED = (() => {
  try {
    return getPreferenceValues<DebugPreferences>().debugMode === true;
  } catch {
    return false;
  }
})();

/**
 * Debug utility for conditional console output.
 * Only logs when debug mode is enabled in preferences.
 */
export class DebugLogger {
  static log(...args: unknown[]): void {
    if (DEBUG_ENABLED) console.log(...args);
  }

  static error(...args: unknown[]): void {
    if (DEBUG_ENABLED) console.error(...args);
  }

  static warn(...args: unknown[]): void {
    if (DEBUG_ENABLED) console.warn(...args);
  }

  static info(...args: unknown[]): void {
    if (DEBUG_ENABLED) console.info(...args);
  }

  static debug(...args: unknown[]): void {
    if (DEBUG_ENABLED) console.debug(...args);
  }
}
