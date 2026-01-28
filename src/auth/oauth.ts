import { OAuth, showToast, Toast, open } from "@raycast/api";
import { setAPIKey } from "../utils/storage";

// GitHub OAuth configuration for Copilot
const GITHUB_CLIENT_ID = "Iv1.3c8c08adc744c772"; // GitHub Copilot client ID
const GITHUB_AUTHORIZE_ENDPOINT = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";
const GITHUB_DEVICE_CODE_ENDPOINT = "https://github.com/login/device/code";

// OAuth PKCE Client for GitHub
export const githubOAuthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "GitHub",
  providerIcon: "github-icon.png",
  description: "Connect your GitHub account for Copilot usage tracking",
});

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface TokenErrorResponse {
  error: string;
  error_description?: string;
}

type TokenPollResponse = TokenResponse | TokenErrorResponse;

/**
 * Initiate GitHub OAuth Device Flow for Copilot
 * This is the preferred method for CLI/extensions
 */
export async function initiateGitHubDeviceFlow(): Promise<boolean> {
  try {
    // Request device code
    const deviceCodeResponse = await fetch(GITHUB_DEVICE_CODE_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        scope: "read:user read:org",
      }),
    });

    if (!deviceCodeResponse.ok) {
      throw new Error("Failed to initiate device flow");
    }

    const deviceData = (await deviceCodeResponse.json()) as DeviceCodeResponse;

    // Show user code and open browser
    await showToast({
      style: Toast.Style.Animated,
      title: "GitHub Authorization",
      message: `Enter code ${deviceData.user_code} at github.com/device`,
    });

    await open(deviceData.verification_uri);

    // Poll for token
    const token = await pollForToken(
      deviceData.device_code,
      deviceData.interval,
      deviceData.expires_in
    );

    if (token) {
      await setAPIKey("copilot", token);
      await showToast({
        style: Toast.Style.Success,
        title: "GitHub Connected",
        message: "Copilot usage tracking enabled",
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error("OAuth error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Authentication Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

async function pollForToken(
  deviceCode: string,
  interval: number,
  expiresIn: number
): Promise<string | null> {
  const startTime = Date.now();
  const expiresAt = startTime + expiresIn * 1000;

  while (Date.now() < expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));

    try {
      const response = await fetch(GITHUB_TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: GITHUB_CLIENT_ID,
          device_code: deviceCode,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });

      const data = (await response.json()) as TokenPollResponse;

      if ("access_token" in data) {
        return data.access_token;
      }

      if (data.error === "authorization_pending") {
        continue;
      }

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }
    } catch (error) {
      console.error("Token poll error:", error);
    }
  }

  return null;
}

/**
 * PKCE OAuth flow (alternative method)
 */
export async function initiateGitHubPKCE(): Promise<boolean> {
  try {
    const authRequest = await githubOAuthClient.authorizationRequest({
      endpoint: GITHUB_AUTHORIZE_ENDPOINT,
      clientId: GITHUB_CLIENT_ID,
      scope: "read:user read:org",
    });

    const { authorizationCode } = await githubOAuthClient.authorize(authRequest);

    // Exchange code for token
    const tokenResponse = await fetch(GITHUB_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        code: authorizationCode,
        redirect_uri: authRequest.redirectURI,
        code_verifier: authRequest.codeVerifier,
      }),
    });

    const tokenData = (await tokenResponse.json()) as TokenResponse;

    if (tokenData.access_token) {
      await setAPIKey("copilot", tokenData.access_token);
      return true;
    }

    return false;
  } catch (error) {
    console.error("PKCE OAuth error:", error);
    return false;
  }
}
