import { useState, useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";
import { graphqlClient } from "./graphql";
import { getTranslations, Translations } from "./translations";

interface Preferences {
  baseUrl: string;
  username: string;
  password: string;
  language: string;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  hasCredentials: boolean;
  preferences: Preferences;
  t: Translations;
}

// Turns low-level login errors into something the user can act on
export const describeLoginError = (err: unknown, baseUrl: string, t: Translations): string => {
  const message = err instanceof Error ? err.message : t.failedToFetchVehicles;

  // DNS/connection errors or a URL that isn't a Zemtu server
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|request failed: (404|5\d\d)/i.test(message)) {
    return t.serverUnreachable;
  }

  // Wrong credentials on the demo server usually means the URL was never changed
  const isDemo = !baseUrl || /^https?:\/\/demo\.zemtu\.com\/?$/i.test(baseUrl.trim());
  return isDemo ? `${message} ${t.demoLoginHint}` : message;
};

export function useAuth(): AuthState {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preferences = getPreferenceValues<Preferences>();
  const t = getTranslations(preferences.language || "en");
  const hasCredentials = Boolean(preferences.username && preferences.password);

  useEffect(() => {
    async function authenticate() {
      try {
        setIsLoading(true);
        setError(null);

        if (!hasCredentials) {
          setError(t.authRequired);
          setIsAuthenticated(false);
          return;
        }

        // Authenticate with JWT (reuses the token if this command already has one)
        await graphqlClient.ensureAuthenticated();
        setIsAuthenticated(true);
      } catch (err) {
        setError(describeLoginError(err, preferences.baseUrl, t));
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    authenticate();
  }, [hasCredentials, preferences.username, preferences.password]);

  return {
    isLoading,
    isAuthenticated,
    error,
    hasCredentials,
    preferences,
    t,
  };
}
