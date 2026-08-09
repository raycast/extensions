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
    console.log("Starting GitHub OAuth authorization...");
    console.log("Worker URL:", CLOUDFLARE_WORKER_URL);

    const authRequest = await oauthClient.authorizationRequest({
      endpoint: "https://github.com/login/oauth/authorize",
      clientId: "Ov23lixtTVkXJr1vXPP3",
      // Scopes required for authentication:
      // - read:user: Read user profile data for authentication
      // - user:email: Read user email for account identification
      scope: "read:user user:email",
    });

    console.log("Authorization request created, waiting for user authorization...");

    const { authorizationCode } = await oauthClient.authorize(authRequest);

    console.log("Authorization code received, exchanging for token...");

    // Exchange authorization code for access token via Cloudflare Worker
    // This keeps the client secret secure on the server
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: authorizationCode,
        code_verifier: authRequest.codeVerifier,
      }),
    });

    console.log("Worker response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Worker error response:", errorText);
      throw new Error(`Worker error: ${response.status} - ${errorText}`);
    }

    const tokens = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    console.log("Tokens received successfully");
    console.log("Has access token:", !!tokens.access_token);

    await oauthClient.setTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });

    console.log("Tokens stored successfully");
  } catch (error) {
    console.error("GitHub OAuth authorization failed:");
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
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
