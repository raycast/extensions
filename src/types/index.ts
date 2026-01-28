export interface UsageData {
  provider: string;
  timestamp: Date;

  // Primary window (usually session/daily)
  primary: {
    used: number;
    limit: number;
    remaining: number;
    usedRatio: number;
  };

  // Secondary window (usually weekly)
  secondary?: {
    used: number;
    limit: number;
    remaining: number;
    usedRatio: number;
  };

  // Opus/Pro tier (for Claude)
  opus?: {
    used: number;
    limit: number;
    remaining: number;
    usedRatio: number;
  };

  // Reset information
  reset?: {
    absoluteTime?: Date;
    relativeTime: string;
    timezone?: string;
  };

  // Cost tracking (where available)
  cost?: {
    used: number;
    limit: number;
    currency: string;
  };

  // Account info
  account?: {
    email?: string;
    organization?: string;
    plan?: string;
  };

  // Raw data for debugging
  raw?: unknown;
}

export type AuthMethod = "oauth" | "cookies" | "cli" | "apikey" | "auto";

export interface ProviderConfig {
  enabled: boolean;
  authMethod: AuthMethod;
  cookieSource?: "auto" | "chrome" | "edge" | "firefox" | "brave";
  apiKey?: string;
}

export interface ProviderCapabilities {
  supportsSession: boolean;
  supportsWeekly: boolean;
  supportsResetTime: boolean;
  supportsCost: boolean;
  authMethods: AuthMethod[];
}

export interface ProviderMetadata {
  id: string;
  name: string;
  icon: string;
  defaultEnabled: boolean;
}

export type DisplayMode = "percentage" | "absolute" | "pace" | "combined";

export interface ExtensionPreferences {
  colorCoding: boolean;
  providers: Record<string, ProviderConfig>;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CLITool {
  name: string;
  commands: string[];
  windowsPaths: string[];
  macPaths: string[];
  linuxPaths: string[];
  usageCommand: string;
  parseOutput: (stdout: string) => Partial<UsageData>;
}

export type ProviderStatus = "configured" | "authenticated" | "error" | "not_configured";

export interface ProviderState {
  usage: UsageData | null;
  lastFetchTime: Date | null;
  error: Error | null;
  status: ProviderStatus;
}
