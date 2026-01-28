import { getPreferenceValues } from "@raycast/api";

export type Browser = "chrome" | "edge" | "firefox" | "brave";

// Cookie preferences type
type CookiePreferences = {
  claudeSessionCookie: string;
  cursorSessionCookie: string;
  geminiSessionCookie: string;
  kimiSessionCookie: string;
  augmentSessionCookie: string;
  droidSessionCookie: string;
}

// Provider-specific cookie configurations
export const PROVIDER_COOKIES: Record<string, { domain: string; names: string[] }> = {
  claude: {
    domain: "claude.ai",
    names: ["sessionKey", "anthropic-session"],
  },
  cursor: {
    domain: "cursor.com",
    names: ["cursor_session", "cursor-token"],
  },
  gemini: {
    domain: "gemini.google.com",
    names: ["__Secure-ENID", "NID"],
  },
  kimi: {
    domain: "kimi.moonshot.cn",
    names: ["token", "session"],
  },
  augment: {
    domain: "augmentcode.com",
    names: ["session", "augment_session"],
  },
  droid: {
    domain: "factory.ai",
    names: ["factory_session", "workos_token"],
  },
};

/**
 * Get manual cookie from preferences
 */
export function getManualCookie(providerId: string): string | null {
  const prefs = getPreferenceValues<CookiePreferences>();

  switch (providerId) {
    case "claude":
      return prefs.claudeSessionCookie || null;
    case "cursor":
      return prefs.cursorSessionCookie || null;
    case "gemini":
      return prefs.geminiSessionCookie || null;
    case "kimi":
      return prefs.kimiSessionCookie || null;
    case "augment":
      return prefs.augmentSessionCookie || null;
    case "droid":
      return prefs.droidSessionCookie || null;
    default:
      return null;
  }
}

/**
 * Extract cookies for a provider
 * First tries manual cookie from preferences, then falls back to browser extraction
 */
export async function extractCookies(
  domain: string,
  cookieNames: string[],
  _browser: Browser = "chrome"
): Promise<Record<string, string> | null> {
  // Find provider ID from domain
  const providerId = Object.entries(PROVIDER_COOKIES).find(
    ([, config]) => config.domain === domain
  )?.[0];

  if (providerId) {
    // Try manual cookie first
    const manualCookie = getManualCookie(providerId);
    if (manualCookie) {
      return { [cookieNames[0]]: manualCookie };
    }
  }

  // Browser cookie extraction is complex and requires:
  // - Windows: DPAPI decryption for Chrome/Edge
  // - macOS: Keychain access
  // - Linux: Various secret stores
  // For now, we only support manual cookie input
  return null;
}

/**
 * Get a specific cookie by name
 */
export async function getCookieFromBrowser(
  cookieName: string,
  domain: string,
  browser: Browser
): Promise<string | null> {
  const cookies = await extractCookies(domain, [cookieName], browser);
  return cookies?.[cookieName] || null;
}

/**
 * Get provider cookie from manual input
 */
export function getProviderCookie(providerId: string): string | null {
  return getManualCookie(providerId);
}
