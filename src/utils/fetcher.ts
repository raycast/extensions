import { showToast, Toast } from "@raycast/api";

interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

export async function fetchWithRetry<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { retries = 3, retryDelay = 1000, ...fetchOptions } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
}

export async function fetchWithAuth<T>(
  url: string,
  token: string,
  options: FetchOptions = {}
): Promise<T> {
  return fetchWithRetry<T>(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

export function handleFetchError(error: Error, providerName: string): void {
  console.error(`[${providerName}] Fetch error:`, error);

  let message = error.message;
  if (error.message.includes("401")) {
    message = "Authentication expired. Please reconnect.";
  } else if (error.message.includes("429")) {
    message = "Rate limited. Please wait.";
  } else if (error.message.includes("Network")) {
    message = "Network error. Check your connection.";
  }

  showToast({
    style: Toast.Style.Failure,
    title: `${providerName} Error`,
    message,
  });
}
