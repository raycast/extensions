import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey?: string;
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TierInfo {
  hasKey: boolean;
  /** True when the selected model requires an API key (tier !== anonymous) */
  modelNeedsKey: boolean;
}

// ─── Custom error with HTTP status ───────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Invalid or revoked API key */
  get isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  /** Free-tier rate limit hit */
  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE_URL = "https://text.pollinations.ai";

/** Returns tier metadata WITHOUT exposing the key value. */
export function getTierInfo(modelTier?: string): TierInfo {
  const prefs = getPreferenceValues<Preferences>();
  return {
    hasKey: !!prefs.apiKey?.trim(),
    modelNeedsKey: !!modelTier && modelTier !== "anonymous",
  };
}

function buildHeaders(): Record<string, string> {
  const prefs = getPreferenceValues<Preferences>();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = prefs.apiKey?.trim();
  if (key) {
    // Key is sent only over HTTPS and never stored or logged anywhere
    headers["Authorization"] = `Bearer ${key}`;
  }
  return headers;
}

async function assertOk(response: Response): Promise<void> {
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body?.error?.message ?? body?.message ?? detail;
    } catch {
      // ignore parse failures
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
    const response = await fetch(`${BASE_URL}/openai`, {
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
  const response = await fetch(`${BASE_URL}/openai`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ model, messages, stream: false }),
  });

  await assertOk(response);

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}
