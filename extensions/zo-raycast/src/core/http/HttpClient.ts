export type HttpClientOptions = {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  maxRetries: number;
};

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("timeout") || message.includes("network") || message.includes("failed to fetch");
  }

  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class HttpClient {
  constructor(private readonly options: HttpClientOptions) {}

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = this.resolveUrl(path);
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.options.apiKey}`,
      "x-api-key": this.options.apiKey,
      ...init.headers,
    };

    const maxAttempts = this.options.maxRetries + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(url, {
          ...init,
          headers,
        });

        if (!response.ok) {
          const text = await response.text();
          const isRetryableStatus = RETRYABLE_STATUS_CODES.has(response.status);

          if (attempt < maxAttempts && isRetryableStatus) {
            await delay(this.backoffMs(attempt));
            continue;
          }

          throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
        }

        const parsed = (await response.json()) as T;
        return parsed;
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts || !isRetryableError(error)) {
          break;
        }

        await delay(this.backoffMs(attempt));
      }
    }

    throw lastError instanceof Error ? lastError : new Error("HTTP request failed");
  }

  private resolveUrl(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.options.baseUrl}${normalizedPath}`;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.options.timeoutMs}ms`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private backoffMs(attempt: number): number {
    return Math.min(250 * 2 ** (attempt - 1), 4000);
  }
}
