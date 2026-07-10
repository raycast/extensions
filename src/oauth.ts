import { OAuth } from "@raycast/api";

// OAuth client for Cookery authentication
export const oauthClient = new OAuth.PKCEClient({
  redirectURI: "https://raycast.com/redirect/oauth",
  tokenEndpoint: "https://cookeryapp.pages.dev/oauth/token",
  authorizationEndpoint: "https://cookeryapp.pages.dev/oauth/authorize",
  clientId: "cookery-raycast-extension",
});

export async function authorize(): Promise<void> {
  try {
    const authRequest = await oauthClient.authorizationRequest({
      endpoint: "https://cookeryapp.pages.dev/oauth/authorize",
      clientId: "cookery-raycast-extension",
      scope: "read write",
    });

    const { authorizationCode } = await oauthClient.authorize(authRequest);

    // Exchange authorization code for tokens
    const response = await fetch("https://cookeryapp.pages.dev/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: authorizationCode,
        client_id: "cookery-raycast-extension",
        grant_type: "authorization_code",
      }),
    });

    const tokens = await response.json();

    await oauthClient.setTokens(tokens);
  } catch (error) {
    console.error("OAuth authorization failed:", error);
    throw error;
  }
}

export async function getAccessToken(): Promise<string | undefined> {
  try {
    const tokens = await oauthClient.getTokens();
    if (tokens?.accessToken) {
      return tokens.accessToken;
    }
    return undefined;
  } catch (error) {
    console.error("Failed to get access token:", error);
    return undefined;
  }
}

export async function logout(): Promise<void> {
  try {
    await oauthClient.removeTokens();
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
}
