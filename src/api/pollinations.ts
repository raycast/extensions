import { getPreferenceValues } from "@raycast/api";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TierInfo {
  hasKey: boolean;
  /** True when the selected model requires payment / API key */
  modelNeedsKey: boolean;
}

// ─── Custom error ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  get isInsufficientBalance(): boolean {
    return this.statusCode === 402;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const BASE_URL = "https://gen.pollinations.ai";

export function getTierInfo(): TierInfo {
  const prefs = getPreferenceValues<Preferences>();
  return {
    hasKey: !!prefs.apiKey?.trim(),
    modelNeedsKey: false,
  };
}

function buildHeaders(): Record<string, string> {
  const prefs = getPreferenceValues<Preferences>();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = prefs.apiKey?.trim();
  if (key) {
    headers["Authorization"] = `Bearer ${key}`;
  }
  return headers;
}

// ─── Friendly error messages ──────────────────────────────────────────────────

export function friendlyError(err: Error): { title: string; message: string } {
  if (err instanceof ApiError) {
    if (err.isAuthError)
      return {
        title: "Invalid API Key",
        message: "Check your key or remove it to use the free tier. (⌘ ,)",
      };
    if (err.isRateLimited)
      return {
        title: "Rate Limited",
        message: "Add an API key to remove the rate limit. (⌘ ,)",
      };
    if (err.isInsufficientBalance)
      return {
        title: "Insufficient Balance",
        message: "Your API key does not have enough credits.",
      };
  }
  return { title: "Error", message: err.message };
}

async function assertOk(response: Response): Promise<void> {
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body?.error?.message ?? body?.message ?? detail;
    } catch {
      // ignore
    }
    throw new ApiError(`${response.status}: ${detail}`, response.status);
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function streamChat(
  messages: Message[],
  model: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ model, messages, stream: true }),
      signal,
    });

    await assertOk(response);

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch {
          // skip malformed SSE lines
        }
      }
    }

    onDone();
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export async function singleChat(
  messages: Message[],
  model: string,
): Promise<string> {
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ model, messages, stream: false }),
  });

  await assertOk(response);

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}
