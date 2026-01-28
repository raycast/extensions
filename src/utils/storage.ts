import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { UsageData, ProviderConfig, CacheEntry, ExtensionPreferences } from "../types";

const USAGE_KEY = "codexbar-usage";
const CACHE_PREFIX = "codexbar-cache:";

// Extended preferences with provider-specific settings
type StoragePreferences = ExtensionPreferences & {
  codexEnabled: boolean;
  claudeEnabled: boolean;
  claudeAuthMethod: string;
  copilotEnabled: boolean;
  cursorEnabled: boolean;
  geminiEnabled: boolean;
  kimiEnabled: boolean;
  kimiApiKey: string;
  kiroEnabled: boolean;
  augmentEnabled: boolean;
  augmentAuthMethod: string;
  droidEnabled: boolean;
  zaiEnabled: boolean;
  zaiApiKey: string;
  antigravityEnabled: boolean;
}

export async function getUsageData(): Promise<UsageData[]> {
  const data = await LocalStorage.getItem<string>(USAGE_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return parsed.map((u: UsageData) => ({
      ...u,
      timestamp: new Date(u.timestamp),
    }));
  } catch {
    return [];
  }
}

export async function setUsageData(usage: UsageData[]): Promise<void> {
  await LocalStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

// Get provider enabled state from Raycast preferences
export function getProviderEnabled(providerId: string): boolean {
  const prefs = getPreferenceValues<StoragePreferences>();
  
  switch (providerId) {
    case "codex":
      return prefs.codexEnabled ?? true;
    case "claude":
      return prefs.claudeEnabled ?? false;
    case "copilot":
      return prefs.copilotEnabled ?? false;
    case "cursor":
      return prefs.cursorEnabled ?? false;
    case "gemini":
      return prefs.geminiEnabled ?? false;
    case "kimi":
      return prefs.kimiEnabled ?? false;
    case "kiro":
      return prefs.kiroEnabled ?? false;
    case "augment":
      return prefs.augmentEnabled ?? false;
    case "droid":
      return prefs.droidEnabled ?? false;
    case "zai":
      return prefs.zaiEnabled ?? false;
    case "antigravity":
      return prefs.antigravityEnabled ?? false;
    default:
      return false;
  }
}

// Get provider config from preferences
export function getProviderConfig(providerId: string): ProviderConfig | null {
  const prefs = getPreferenceValues<StoragePreferences>();
  const enabled = getProviderEnabled(providerId);
  
  let authMethod: ProviderConfig["authMethod"] = "auto";
  
  // Get auth method from preferences for providers with multiple options
  switch (providerId) {
    case "claude":
      authMethod = (prefs.claudeAuthMethod as ProviderConfig["authMethod"]) || "auto";
      break;
    case "augment":
      authMethod = (prefs.augmentAuthMethod as ProviderConfig["authMethod"]) || "auto";
      break;
    case "kimi":
    case "zai":
      authMethod = "apikey";
      break;
    default:
      authMethod = "auto";
  }
  
  return {
    enabled,
    authMethod,
  };
}

// Get API key from preferences
export function getAPIKey(providerId: string): string | null {
  const prefs = getPreferenceValues<StoragePreferences>();
  
  switch (providerId) {
    case "kimi":
      return prefs.kimiApiKey || null;
    case "zai":
      return prefs.zaiApiKey || null;
    default:
      return null;
  }
}

// Deprecated: setProviderConfig is no longer used since we use Raycast preferences
export async function setProviderConfig(_providerId: string, _config: ProviderConfig): Promise<void> {
  // No-op: preferences are managed through Raycast settings
}

// Deprecated: API keys are now stored in preferences
export async function setAPIKey(_providerId: string, _apiKey: string): Promise<void> {
  // No-op: API keys are managed through Raycast settings
}

export async function removeAPIKey(_providerId: string): Promise<void> {
  // No-op: API keys are managed through Raycast settings
}

export class ProviderCache {
  async get<T>(key: string): Promise<T | null> {
    const data = await LocalStorage.getItem<string>(`${CACHE_PREFIX}${key}`);
    if (!data) return null;
    try {
      const entry: CacheEntry<T> = JSON.parse(data);
      if (this.isStale(entry)) {
        await this.invalidate(key);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };
    await LocalStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  }

  async invalidate(key: string): Promise<void> {
    await LocalStorage.removeItem(`${CACHE_PREFIX}${key}`);
  }

  async invalidateAll(): Promise<void> {
    const allItems = await LocalStorage.allItems();
    for (const key of Object.keys(allItems)) {
      if (key.startsWith(CACHE_PREFIX)) {
        await LocalStorage.removeItem(key);
      }
    }
  }

  isStale<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
}

export const cache = new ProviderCache();
