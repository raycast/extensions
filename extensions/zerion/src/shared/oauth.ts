import { OAuth } from "@raycast/api";

export const DASHBOARD_URL = "https://dashboard.zerion.io";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Zerion",
  providerIcon: "zerion_icon.png",
  providerId: "zerion",
  description: "Sign in with Zerion to connect a free API key. The Developer plan includes 60,000 requests per month.",
});

/**
 * The dashboard has no token-exchange endpoint: the `code` callback parameter
 * carries the org API key directly (dashboard ADR 0001), so the authorization
 * code is stored as the access token. The key never expires and there is no
 * refresh token — a 401 from the API is the only revocation signal.
 */
async function authorize(): Promise<string> {
  const tokenSet = await oauthClient.getTokens();
  if (tokenSet?.accessToken) {
    return tokenSet.accessToken;
  }
  const authRequest = await oauthClient.authorizationRequest({
    endpoint: `${DASHBOARD_URL}/oauth/authorize`,
    clientId: "raycast",
    scope: "",
  });
  const { authorizationCode } = await oauthClient.authorize(authRequest);
  await oauthClient.setTokens({ accessToken: authorizationCode });
  return authorizationCode;
}

/** Provider for `withAccessToken` — wraps every API-backed command and AI tool. */
export const zerionOAuth = { authorize, client: oauthClient };

/** Async read of the stored API key, for surfaces outside a `withAccessToken` context (menu bar). */
export async function getStoredApiKey(): Promise<string | undefined> {
  return (await oauthClient.getTokens())?.accessToken;
}

export async function clearStoredApiKey(): Promise<void> {
  await oauthClient.removeTokens();
}
