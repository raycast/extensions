import { LocalStorage, showToast, Toast, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  clientId: string;
  clientSecret: string;
  dataCenter: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  api_domain?: string;
  token_type?: string;
}

const preferences = getPreferenceValues<Preferences>();

const STORAGE_KEYS = {
  ACCESS_TOKEN: "zoho_access_token",
  REFRESH_TOKEN: "zoho_refresh_token",
  EXPIRES_AT: "zoho_expires_at",
};

function getAuthUrls(dataCenter: string) {
  return {
    accounts: `https://accounts.zoho.${dataCenter}`,
    bookings: `https://bookings.zoho.${dataCenter}`,
  };
}

const SCOPES = "zohobookings.data.CREATE";

export async function exchangeAuthCodeForTokens(authCode: string): Promise<void> {
  try {
    const urls = getAuthUrls(preferences.dataCenter);

    const params = new URLSearchParams({
      code: authCode,
      client_id: preferences.clientId,
      client_secret: preferences.clientSecret,
      grant_type: "authorization_code",
    });

    const response = await fetch(`${urls.accounts}/oauth/v2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = (await response.json()) as TokenResponse;

    await LocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
    if (data.refresh_token) {
      await LocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
    }

    const expiresAt = Date.now() + (data.expires_in - 300) * 1000;
    await LocalStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());

    await showToast({
      style: Toast.Style.Success,
      title: "Authentication Successful",
      message: "Zoho tokens stored securely",
    });

    console.log("Tokens stored successfully!");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Authentication Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function getValidToken(): Promise<string> {
  const accessToken = await LocalStorage.getItem<string>(STORAGE_KEYS.ACCESS_TOKEN);
  const expiresAt = await LocalStorage.getItem<string>(STORAGE_KEYS.EXPIRES_AT);

  if (accessToken && expiresAt && Date.now() < parseInt(expiresAt)) {
    return accessToken;
  }

  return await refreshAccessToken();
}

async function refreshAccessToken(): Promise<string> {
  try {
    const refreshToken = await LocalStorage.getItem<string>(STORAGE_KEYS.REFRESH_TOKEN);

    if (!refreshToken) {
      throw new Error("No refresh token found. Please run the Setup Zoho Auth command first.");
    }

    const urls = getAuthUrls(preferences.dataCenter);

    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: preferences.clientId,
      client_secret: preferences.clientSecret,
      grant_type: "refresh_token",
    });

    const response = await fetch(`${urls.accounts}/oauth/v2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const data = (await response.json()) as TokenResponse;

    await LocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
    const expiresAt = Date.now() + (data.expires_in - 300) * 1000;
    await LocalStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());

    return data.access_token;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Token Refresh Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const refreshToken = await LocalStorage.getItem<string>(STORAGE_KEYS.REFRESH_TOKEN);
  return !!refreshToken;
}

export async function clearTokens(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  await LocalStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  await LocalStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);

  await showToast({
    style: Toast.Style.Success,
    title: "Logged Out",
    message: "All tokens cleared",
  });
}

export function getAuthorizationInstructions(): string {
  return `To authenticate:

1. Go to Zoho API Console: https://api-console.zoho.${preferences.dataCenter}
2. Select your Self Client (or create one if needed)
3. Go to the "Generate Code" tab
4. Set Scope: ${SCOPES}
5. Set Time Duration: 3-10 minutes
6. Set Description: Raycast Extension
7. Click "Create"
8. Copy the generated code
9. Paste it in the Setup command (valid for the duration you selected!)`;
}
