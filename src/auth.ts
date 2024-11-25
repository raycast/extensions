import { clearLocalStorage, showToast, Toast, LocalStorage } from "@raycast/api";
import fetch from "node-fetch";
import { getLibreViewCredentials } from "./preferences";

const API_BASE = "https://api.libreview.io";
const API_HEADERS = {
  "Content-Type": "application/json",
  Product: "llu.android",
  Version: "4.7.0",
  "Accept-Encoding": "gzip",
};

const LOGGED_OUT_KEY = "logged_out";
const AUTH_TOKEN_KEY = "auth_token";

interface AuthResponse extends Record<string, unknown> {
  status: number;
  data: {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    authTicket: {
      token: string;
      expires: number;
      duration: number;
    };
  };
}

function isAuthResponse(data: unknown): data is AuthResponse {
  if (typeof data !== "object" || data === null) return false;

  const response = data as Record<string, unknown>;
  return (
    "status" in response &&
    "data" in response &&
    typeof response.data === "object" &&
    response.data !== null &&
    "authTicket" in (response.data as Record<string, unknown>) &&
    typeof (response.data as Record<string, unknown>).authTicket === "object" &&
    (response.data as Record<string, unknown>).authTicket !== null &&
    "token" in ((response.data as Record<string, unknown>).authTicket as Record<string, unknown>) &&
    typeof ((response.data as Record<string, unknown>).authTicket as Record<string, unknown>).token === "string"
  );
}

interface ErrorResponse {
  message?: string;
  status?: number;
}

export async function authenticate(): Promise<string> {
  console.log("Authenticating...");
  const credentials = getLibreViewCredentials();

  if (!credentials?.username || !credentials?.password) {
    console.error("No credentials found");
    throw new Error("Missing LibreView credentials");
  }

  try {
    console.log("Sending auth request...");
    const response = await fetch(`${API_BASE}/llu/auth/login`, {
      method: "POST",
      headers: {
        ...API_HEADERS,
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: credentials.username,
        password: credentials.password,
      }),
    });

    const data = await response.json();
    console.log("Auth response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      const data = (await response.json()) as ErrorResponse;
      throw new Error(data.message || `Authentication failed: ${response.status}`);
    }

    if (!isAuthResponse(data)) {
      console.error("Invalid response format:", data);
      throw new Error("Invalid authentication response format");
    }

    const token = data.data.authTicket.token;
    if (!token) {
      throw new Error("No token in authentication response");
    }

    console.log("Authentication successful");
    return token;
  } catch (error) {
    console.error("Authentication error:", error);

    if (error instanceof Error) {
      if (error.message.includes("401")) {
        throw new Error("Invalid username or password. Please check your LibreView credentials.");
      } else if (error.message.includes("429")) {
        throw new Error("Too many login attempts. Please try again in a few minutes.");
      } else if (error.message.includes("503")) {
        throw new Error("LibreView service is temporarily unavailable. Please try again later.");
      }
    }
    throw error;
  }
}

export async function logout() {
  try {
    await clearLocalStorage();
    await LocalStorage.removeItem(AUTH_TOKEN_KEY);
    await LocalStorage.setItem(LOGGED_OUT_KEY, "true");
    await showToast({
      style: Toast.Style.Success,
      title: "Logged out successfully",
      message: "Please quit and restart the menu bar app",
    });
  } catch (error) {
    console.error("Error during logout:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to log out",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

type IsLoggedOutFunction = () => Promise<boolean>;

export const isLoggedOut: IsLoggedOutFunction = async () => {
  try {
    const value = await LocalStorage.getItem(LOGGED_OUT_KEY);
    return value === "true";
  } catch {
    return false;
  }
};

export async function clearLoggedOutState() {
  await LocalStorage.removeItem(LOGGED_OUT_KEY);
}

export async function attemptLogin(): Promise<boolean> {
  try {
    const credentials = getLibreViewCredentials();
    if (!credentials?.username || !credentials?.password) {
      return false;
    }

    // Clear logged out state first
    await clearLoggedOutState();

    // Attempt authentication
    const token = await authenticate();
    if (token) {
      await LocalStorage.setItem(AUTH_TOKEN_KEY, token);
      await showToast({
        style: Toast.Style.Success,
        title: "Successfully logged in",
        message: "Your LibreView credentials are valid",
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Login attempt failed:", error);
    await LocalStorage.setItem(LOGGED_OUT_KEY, "true");
    await showToast({
      style: Toast.Style.Failure,
      title: "Login failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}
