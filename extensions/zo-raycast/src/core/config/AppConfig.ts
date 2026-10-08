import { getPreferenceValues } from "@raycast/api";

const DEFAULT_ZO_API_BASE_URL = "https://api.zo.computer";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;

function parseNumberSetting(value: string | undefined, fallback: number, min: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }

  return Math.floor(parsed);
}

function normalizeBaseUrl(baseUrl: string | undefined): string {
  const normalized = (baseUrl ?? "").trim().replace(/\/+$/, "");
  return normalized.length > 0 ? normalized : DEFAULT_ZO_API_BASE_URL;
}

function parseBooleanSetting(value: boolean | undefined, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export class AppConfigManager {
  static readPreferences(): Preferences {
    return getPreferenceValues<Preferences>();
  }

  static getConfig() {
    const preferences = AppConfigManager.readPreferences();

    return {
      apiKey: preferences.zoApiKey?.trim() ?? "",
      zoApiBaseUrl: normalizeBaseUrl(preferences.zoApiBaseUrl),
      requestTimeoutMs: parseNumberSetting(preferences.requestTimeoutMs, DEFAULT_TIMEOUT_MS, 1000),
      maxRetries: parseNumberSetting(preferences.maxRetries, DEFAULT_MAX_RETRIES, 0),
      enableChatStreaming: parseBooleanSetting(preferences.enableChatStreaming, false),
    };
  }
}
