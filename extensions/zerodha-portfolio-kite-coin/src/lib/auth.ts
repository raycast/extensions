import { LocalStorage } from "@raycast/api";
import {
  KITE_LOGIN_ENDPOINT,
  KITE_TWOFA_ENDPOINT,
  STORAGE_KEYS,
  TOKEN_EXPIRY_UTC_HOURS,
  TOKEN_EXPIRY_UTC_MINUTES,
} from "./constants";

/**
 * Check if a stored token timestamp indicates the token has expired.
 * Tokens expire daily at 6 AM IST (00:30 UTC).
 */
export function isTokenExpired(tokenTimestamp: string): boolean {
  const now = new Date();
  const tokenDate = new Date(tokenTimestamp);
  const nextExpiry = new Date(tokenDate);
  nextExpiry.setUTCHours(
    TOKEN_EXPIRY_UTC_HOURS,
    TOKEN_EXPIRY_UTC_MINUTES,
    0,
    0,
  );
  if (nextExpiry <= tokenDate) {
    nextExpiry.setUTCDate(nextExpiry.getUTCDate() + 1);
  }
  return now >= nextExpiry;
}

/**
 * Load stored auth state from LocalStorage.
 */
export async function loadStoredAuth(): Promise<{
  accessToken: string | null;
  tokenTimestamp: string | null;
  userId: string | null;
}> {
  const [accessToken, tokenTimestamp, userId] = await Promise.all([
    LocalStorage.getItem<string>(STORAGE_KEYS.ACCESS_TOKEN),
    LocalStorage.getItem<string>(STORAGE_KEYS.TOKEN_TIMESTAMP),
    LocalStorage.getItem<string>(STORAGE_KEYS.USER_ID),
  ]);
  return {
    accessToken: accessToken ?? null,
    tokenTimestamp: tokenTimestamp ?? null,
    userId: userId ?? null,
  };
}

/**
 * Store auth tokens in LocalStorage.
 */
export async function storeAuth(
  accessToken: string,
  userId: string,
): Promise<void> {
  await Promise.all([
    LocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
    LocalStorage.setItem(
      STORAGE_KEYS.TOKEN_TIMESTAMP,
      new Date().toISOString(),
    ),
    LocalStorage.setItem(STORAGE_KEYS.USER_ID, userId),
  ]);
}

/**
 * Clear stored auth tokens.
 */
export async function clearAuth(): Promise<void> {
  const keysToRemove = [
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.TOKEN_TIMESTAMP,
    STORAGE_KEYS.USER_ID,
    STORAGE_KEYS.HOLDINGS,
    STORAGE_KEYS.POSITIONS,
    STORAGE_KEYS.ORDERS,
    STORAGE_KEYS.MARGINS,
    STORAGE_KEYS.MF_HOLDINGS,
    STORAGE_KEYS.MF_SIPS,
    STORAGE_KEYS.MF_ORDERS,
  ];

  await Promise.all(keysToRemove.map((key) => LocalStorage.removeItem(key)));
}

/**
 * Store the remembered user ID.
 */
export async function storeRememberedUserId(userId: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.REMEMBERED_USER_ID, userId);
}

/**
 * Get the remembered user ID.
 */
export async function getRememberedUserId(): Promise<string | undefined> {
  return await LocalStorage.getItem<string>(STORAGE_KEYS.REMEMBERED_USER_ID);
}

/**
 * Clear the remembered user ID.
 */
export async function clearRememberedUserId(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.REMEMBERED_USER_ID);
}

/**
 * Perform login using Zerodha's internal enctoken auth.
 * Step 1: POST /api/login with user_id + password → get request_id
 * Step 2: POST /api/twofa with user_id + request_id + twofa_value → get enctoken from Set-Cookie
 */
export async function performLogin(
  userId: string,
  password: string,
  totpCode: string,
): Promise<string> {
  // Step 1: Login with credentials
  const loginResponse = await fetch(KITE_LOGIN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ user_id: userId, password }),
  });

  if (!loginResponse.ok) {
    const status = loginResponse.status;
    if (status === 403 || status === 401) {
      throw new Error("INVALID_CREDENTIALS");
    }
    throw new Error(`Login failed (${status})`);
  }

  const loginData = (await loginResponse.json()) as {
    data: { request_id: string };
  };
  const requestId = loginData.data.request_id;

  // Step 2: Two-factor auth with TOTP
  const twofaResponse = await fetch(KITE_TWOFA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      user_id: userId,
      request_id: requestId,
      twofa_value: totpCode,
    }),
    redirect: "manual",
  });

  if (twofaResponse.status === 403 || twofaResponse.status === 401) {
    throw new Error("INVALID_TOTP");
  }

  // Extract enctoken from Set-Cookie header
  const cookies = twofaResponse.headers.get("set-cookie") ?? "";
  const match = cookies.match(/enctoken=([^;]+)/);

  if (!match) {
    throw new Error("Failed to extract enctoken from response");
  }

  return match[1];
}
