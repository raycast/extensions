import { Message, OllamaTool, OllamaToolCall, OllamaModel } from "./types";

// Fetch available models from Ollama
export async function fetchModels(url: string): Promise<OllamaModel[]> {
  const res = await fetch(`${url}/api/tags`);
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
  const data = (await res.json()) as { models?: OllamaModel[] };
  return data.models || [];
}

// Stream a chat completion with optional tool support
export interface StreamCallbacks {
  onToken: (token: string) => void;
  onToolCalls: (calls: OllamaToolCall[]) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function streamChat(
  url: string,
  model: string,
  messages: Message[],
  tools: OllamaTool[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
  };

  // Only include tools if we have some (and model supports it)
  if (tools.length > 0) {
    body.tools = tools;
  }

  const res = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  const toolCalls: OllamaToolCall[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);

        // Handle regular content tokens
        if (json.message?.content) {
          callbacks.onToken(json.message.content);
        }

        // Handle tool calls
        if (json.message?.tool_calls) {
          for (const tc of json.message.tool_calls) {
            toolCalls.push(tc);
          }
        }

        // Done
        if (json.done) {
          if (toolCalls.length > 0) {
            callbacks.onToolCalls(toolCalls);
          }
          callbacks.onDone();
        }
      } catch {
        // skip malformed lines
      }
    }
  }
}
