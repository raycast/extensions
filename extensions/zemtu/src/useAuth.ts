import { getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { graphqlClient } from "./graphql";

const SERVER_UNREACHABLE =
  "Zemtu could not be reached. Check the Zemtu URL in the preferences and your internet connection.";
const DEMO_LOGIN_HINT =
  "You are connected to the Zemtu demo (demo.zemtu.com). Enter your provider's Zemtu URL in the preferences, e.g. https://yourcompany.zemtu.com.";

// Turns low-level request errors into something the user can act on
export const describeLoadError = (err: unknown): string => {
  const message = err instanceof Error ? err.message : String(err);

  // DNS/connection errors, a mistyped URL or one that isn't a Zemtu server (answers with an HTML page)
  if (
    /fetch failed|Invalid URL|parse URL|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|request failed: (404|5\d\d)|not valid JSON|Unexpected token/i.test(
      message,
    )
  ) {
    return SERVER_UNREACHABLE;
  }
  return message;
};

export const describeLoginError = (err: unknown, baseUrl: string): string => {
  const message = describeLoadError(err);
  if (message === SERVER_UNREACHABLE) return message;

  // Wrong credentials on the demo server usually means the URL was never changed
  const isDemo = !baseUrl || /^https?:\/\/demo\.zemtu\.com\/?$/i.test(baseUrl.trim());
  return isDemo ? `${message} ${DEMO_LOGIN_HINT}` : message;
};

const authenticate = async (username: string, password: string) => {
  // Arguments only re-run the login when the preferences change; the client reads them itself
  void username;
  void password;
  await graphqlClient.ensureAuthenticated();
  return true;
};

export function useAuth() {
  const preferences = getPreferenceValues<Preferences>();
  const hasCredentials = Boolean(preferences.username && preferences.password);

  const {
    data: isAuthenticated = false,
    isLoading,
    error,
    revalidate: retryLogin,
  } = usePromise(authenticate, [preferences.username, preferences.password], {
    execute: hasCredentials,
    // Every command shows login errors in its own view
    onError: () => undefined,
  });

  return {
    isLoading: hasCredentials && isLoading,
    isAuthenticated,
    error: !hasCredentials
      ? "Authentication Required"
      : error
        ? describeLoginError(error, graphqlClient.getBaseUrl())
        : null,
    hasCredentials,
    preferences,
    retryLogin,
  };
}
