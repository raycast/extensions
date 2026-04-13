import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey?: string;
  model?: string;
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TierInfo {
  hasKey: boolean;
  model: string;
  modelNeedsKey: boolean;
}

// Models that require at least a Seed-tier API key
const KEY_REQUIRED_MODELS = new Set([
  "openai-large",
  "openai-reasoning",
  "gemini",
  "gemini-search",
  "deepseek",
  "claudyclaude",
]);

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
export function getTierInfo(): TierInfo {
  const prefs = getPreferenceValues<Preferences>();
  const model = prefs.model || "openai";
  return {
    hasKey: !!prefs.apiKey?.trim(),
    model,
    modelNeedsKey: KEY_REQUIRED_MODELS.has(model),
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
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
  signal?: AbortSignal,
): Promise<void> {
  const { model } = getTierInfo();

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

export async function singleChat(messages: Message[]): Promise<string> {
  const { model } = getTierInfo();

  const response = await fetch(`${BASE_URL}/openai`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ model, messages, stream: false }),
  });

  await assertOk(response);

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}
