import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey?: string;
  model?: string;
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const BASE_URL = "https://text.pollinations.ai";

function getHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

export async function streamChat(
  messages: Message[],
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
  signal?: AbortSignal,
): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  const model = prefs.model || "openai";
  const apiKey = prefs.apiKey || undefined;

  try {
    const response = await fetch(`${BASE_URL}/openai`, {
      method: "POST",
      headers: getHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

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
  const prefs = getPreferenceValues<Preferences>();
  const model = prefs.model || "openai";
  const apiKey = prefs.apiKey || undefined;

  const response = await fetch(`${BASE_URL}/openai`, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}
