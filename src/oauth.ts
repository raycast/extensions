import { OAuth } from "@raycast/api";

// Cloudflare Worker URL for secure OAuth token exchange
const CLOUDFLARE_WORKER_URL = "https://cookerygithublogin.jamesttheakston2.workers.dev/";

// GitHub OAuth client for Cookery authentication
export const oauthClient = new OAuth.PKCEClient({
  providerName: "GitHub",
  redirectMethod: OAuth.RedirectMethod.Web,
  description: "Sign in with GitHub to generate recipes",
});

export async function authorize(): Promise<void> {
  try {
    const authRequest = await oauthClient.authorizationRequest({
      endpoint: "https://github.com/login/oauth/authorize",
      clientId: "Ov23lixtTVkXJr1vXPP3",
      scope: "read:user user:email",
    });

    const { authorizationCode } = await oauthClient.authorize(authRequest);

    // Exchange authorization code for access token via Cloudflare Worker
    // This keeps the client secret secure on the server
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: authorizationCode,
      }),
    });

    const tokens = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    await oauthClient.setTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });
  } catch (error) {
    console.error("GitHub OAuth authorization failed:", error);
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
