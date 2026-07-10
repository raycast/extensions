import { OAuth } from "@raycast/api";

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
      clientId: "YOUR_GITHUB_CLIENT_ID", // Replace with your GitHub OAuth app client ID
      scope: "read:user user:email",
    });

    const { authorizationCode } = await oauthClient.authorize(authRequest);

    // Exchange authorization code for access token
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        code: authorizationCode,
        client_id: "YOUR_GITHUB_CLIENT_ID", // Replace with your GitHub OAuth app client ID
        client_secret: "YOUR_GITHUB_CLIENT_SECRET", // Replace with your GitHub OAuth app client secret
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
