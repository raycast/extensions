import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ZendeskInstance } from "../utils/preferences";

/**
 * Common error handling for Zendesk API calls
 */
export async function handleZendeskApiError(response: Response, operation: string, errorText?: string): Promise<never> {
  const errorMessage = errorText || (await response.text());
  const fullError = `Failed to ${operation}: ${response.status} - ${errorMessage}`;

  await showFailureToast(new Error(fullError), { title: "Zendesk API Error" });
  throw new Error(`Zendesk API Error: ${fullError}`);
}

/**
 * Common connection error handling
 */
export function handleConnectionError(error: unknown): never {
  showToast(
    Toast.Style.Failure,
    "Connection Error",
    "Could not connect to Zendesk API. Please check your internet connection or API settings.",
  );
  throw error;
}

/**
 * Create standard headers for Zendesk API requests
 */
export function createZendeskHeaders(instance: ZendeskInstance): Record<string, string> {
  const credentials = `${instance.user}/token:${instance.api_key}`;
  const authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

  return {
    Authorization: authHeader,
    "Content-Type": "application/json",
  };
}

/**
 * Build Zendesk API URL
 */
export function buildZendeskUrl(instance: ZendeskInstance, endpoint: string): string {
  return `https://${instance.subdomain}.zendesk.com/api/v2${endpoint}`;
}

/**
 * Common fetch wrapper with error handling
 */
export async function zendeskFetch<T>(
  url: string,
  instance: ZendeskInstance,
  options: RequestInit = {},
  operation: string,
): Promise<T> {
  const headers = createZendeskHeaders(instance);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      await handleZendeskApiError(response, operation);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Zendesk API Error")) {
      throw error;
    }
    handleConnectionError(error);
  }
}
