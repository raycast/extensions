// ---- API ----

export const KITE_API_BASE = "https://kite.zerodha.com/oms";
export const KITE_LOGIN_ENDPOINT = "https://kite.zerodha.com/api/login";
export const KITE_TWOFA_ENDPOINT = "https://kite.zerodha.com/api/twofa";

// ---- Storage Keys ----

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "kite_access_token",
  TOKEN_TIMESTAMP: "kite_token_timestamp",
  USER_ID: "kite_user_id",
  REMEMBERED_USER_ID: "kite_remembered_user_id",
  HOLDINGS: "cache_holdings",
  POSITIONS: "cache_positions",
  ORDERS: "cache_orders",
  MARGINS: "cache_margins",
  MF_HOLDINGS: "cache_mf_holdings",
  MF_SIPS: "cache_mf_sips",
  MF_ORDERS: "cache_mf_orders",
} as const;

// ---- Copy Text ----

export const COPY = {
  // First Run / Logged-Out
  LOGIN_TITLE: "Login with Zerodha",
  LOGIN_DESCRIPTION:
    "Zerodha requires a quick login once per day to securely access your portfolio. Your credentials are only used to authenticate — they are never stored.",
  LOGIN_ACTION: "Login with Zerodha",
  POWERED_BY: "Powered by Zerodha",

  // Login Banner (Expired State)
  LOGIN_BANNER_TITLE: "Login to Zerodha",
  LOGIN_BANNER_SUBTITLE: "Login required to refresh today's portfolio",
  TRUST_LINE:
    "Powered by Zerodha · Your credentials are only used to authenticate",

  // Toasts
  TOAST_LOGIN_SUCCESS_TITLE: "Logged in successfully",
  TOAST_LOGIN_SUCCESS_MESSAGE: "Your portfolio is loading...",
  TOAST_SESSION_ENDED_TITLE: "Session ended",
  TOAST_SESSION_ENDED_MESSAGE: "Please log in again to refresh today's data.",
  TOAST_REFRESH_TITLE: "Portfolio updated",
  TOAST_REFRESH_MESSAGE: "Data refreshed just now",
  TOAST_RATE_LIMITED: "Please wait a moment before refreshing.",
  TOAST_NETWORK_ERROR: "Unable to connect. Showing your last synced data.",
  TOAST_SERVER_ERROR: "Zerodha's servers are temporarily unavailable.",
  TOAST_LOGIN_FAILED: "Login didn't complete. Please try again.",
  TOAST_INVALID_CREDENTIALS: "Invalid user ID or password. Please try again.",
  TOAST_INVALID_TOTP: "Invalid TOTP code. Please try again.",

  // Empty States
  EMPTY_HOLDINGS_TITLE: "No Holdings Yet",
  EMPTY_HOLDINGS_DESCRIPTION: "Your stock holdings will appear here.",
  EMPTY_MF_TITLE: "No Mutual Funds Yet",
  EMPTY_MF_DESCRIPTION: "Your Coin investments will appear here.",

  // Section Titles
  SECTION_HOLDINGS: "Holdings",
  SECTION_POSITIONS: "Positions",
  SECTION_ORDERS: "Today's Orders",
  SECTION_MARGINS: "Margins",
  SECTION_MF_HOLDINGS: "MF Holdings",
  SECTION_SIPS: "Active SIPs",
  SECTION_MF_ORDERS: "Recent MF Orders",
} as const;

// ---- Kite Web URLs ----

export const KITE_WEB_URL = "https://kite.zerodha.com";
export const COIN_WEB_URL = "https://coin.zerodha.com";

// ---- Token Expiry (6 AM IST = 00:30 UTC) ----

export const TOKEN_EXPIRY_UTC_HOURS = 0;
export const TOKEN_EXPIRY_UTC_MINUTES = 30;
