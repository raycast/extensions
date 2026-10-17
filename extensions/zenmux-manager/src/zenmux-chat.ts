export const MODELS_URL = "https://zenmux.ai/api/v1/models";
export const CHAT_COMPLETIONS_URL = "https://zenmux.ai/api/v1/chat/completions";

const VISION_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
const REASONING_EFFORTS = ["minimal", "low", "medium", "high"] as const;
const DEFAULT_REASONING_EFFORT: ReasoningEffort = "medium";

type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export type ZenMuxCatalogModel = {
  id: string;
  display_name?: string;
  owned_by?: string;
  input_modalities?: string[];
  output_modalities?: string[];
  capabilities?: {
    reasoning?: boolean;
    tools?: boolean;
    function_calling?: boolean;
  };
  context_length?: number;
};

export type ProvidedModel = {
  id: string;
  title: string;
  description?: string;
  contextWindow?: number;
  capabilities: {
    systemMessage: { supported: boolean };
    temperature: { supported: boolean };
    streaming: { supported: boolean };
    tools: { supported: boolean };
    vision?: { mediaTypes: Array<(typeof VISION_MEDIA_TYPES)[number]> };
    reasoningEffort?: { supported: true; options: ReasoningEffort[]; default: ReasoningEffort };
  };
};

type TextPart = { type: "text"; text: string };
type FilePart = { type: "file"; data: string | Uint8Array | ArrayBuffer | URL; mediaType: string };
type ReasoningPart = { type: "reasoning"; text: string };
type ToolCallPart = { type: "tool-call"; toolCallId: string; toolName: string; input: unknown };
type ToolResultPart = {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  output: { type: "json"; value: unknown } | unknown;
};

export type ProviderMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: Array<TextPart | FilePart> }
  | { role: "assistant"; content: Array<TextPart | FilePart | ReasoningPart | ToolCallPart> }
  | { role: "tool"; content: ToolResultPart[] };

export type ProviderRequest = {
  system?: string;
  messages?: ProviderMessage[];
  temperature?: number;
  tools?: Record<string, { description?: string; inputSchema?: unknown }>;
  toolChoice?: "auto" | "required";
  providerOptions?: {
    raycast?: {
      reasoningEffort?: string;
    };
  };
};

export type ProviderModelRef = {
  id: string;
  capabilities?: {
    temperature?: { supported?: boolean };
    tools?: { supported?: boolean };
    reasoningEffort?: { supported?: boolean };
  };
};

type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | Array<Record<string, unknown>> }
  | {
      role: "assistant";
      content: string | null;
      reasoning?: string;
      tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

export type ChatCompletionBody = {
  model: string;
  messages: ChatMessage[];
  stream: true;
  stream_options: { include_usage: true };
  temperature?: number;
  tools?: Array<{ type: "function"; function: { name: string; description?: string; parameters: unknown } }>;
  tool_choice?: "auto" | "required";
  reasoning_effort?: ReasoningEffort;
};

type TokenUsage = { inputTokens?: number; outputTokens?: number; totalTokens?: number };

export type ChatStreamPart =
  | { type: "text-delta"; id: string; text: string }
  | { type: "reasoning-delta"; id: string; text: string }
  | { type: "tool-call"; toolCallId: string; toolName: string; input: unknown }
  | {
      type: "finish";
      finishReason: "stop" | "length" | "content-filter" | "tool-calls" | "error" | "other" | "unknown";
      totalUsage?: TokenUsage;
    };

type PendingToolCall = { index: number; id?: string; name?: string; arguments: string };

type ChatChunk = {
  error?: unknown;
  choices?: Array<{
    delta?: {
      content?: string | null;
      refusal?: string | null;
      reasoning?: string | null;
      reasoning_content?: string | null;
      reasoning_details?: Array<{ text?: string }>;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export class ZenMuxModelConfigError extends Error {}

export function requireModelApiKey(value: string | undefined): string {
  const apiKey = value?.trim();
  if (!apiKey) {
    throw new ZenMuxModelConfigError(
      "Set the Model API Key in ZenMux Manager preferences. Use a Subscription key (sk-ss-v1-...) or a PAYG key (sk-ai-v1-...). The Platform API key cannot call models.",
    );
  }

  return apiKey;
}

export function modelAccessError(status: number, body: string): Error {
  if (status === 401 || status === 403) {
    return new ZenMuxModelConfigError(
      "ZenMux rejected the Model API Key. Use a Subscription key (sk-ss-v1-...) or a PAYG key (sk-ai-v1-...), not the Platform API key.",
    );
  }

  return new Error(readApiErrorMessage(status, body));
}

export function readApiErrorMessage(status: number, body: string): string {
  try {
    const payload = JSON.parse(body) as { error?: unknown; message?: unknown };
    const nested =
      payload?.error && typeof payload.error === "object" && "message" in payload.error
        ? (payload.error as { message?: unknown }).message
        : undefined;
    const message = [nested, payload?.message, payload?.error].find(
      (value) => typeof value === "string" && value.trim(),
    );
    if (typeof message === "string") {
      return `${status} ${message.trim()}`;
    }
  } catch {
    // Fall through to the raw response body.
  }

  const trimmed = body.trim();
  return trimmed ? `${status} ${trimmed.slice(0, 500)}` : `${status} ZenMux request failed`;
}

export function parseModelCatalog(payload: unknown): ZenMuxCatalogModel[] {
  const data = catalogArray(payload);
  if (!data) {
    throw new Error("ZenMux returned an unexpected model list.");
  }

  return data.flatMap((item) => {
    const model = asCatalogModel(item);
    return model ? [model] : [];
  });
}

export function toRegisteredModels(models: ZenMuxCatalogModel[]): ProvidedModel[] {
  const byId = new Map<string, ProvidedModel>();

  for (const model of models) {
    if (!isChatModel(model) || byId.has(model.id)) {
      continue;
    }

    const reasoning = model.capabilities?.reasoning === true;
    // ZenMux's catalog currently reports reasoning, but omits tool support even
    // for tool-capable models. Allow tools unless the catalog explicitly opts out.
    const toolsSupported = model.capabilities?.tools !== false && model.capabilities?.function_calling !== false;
    const contextWindow =
      typeof model.context_length === "number" && Number.isFinite(model.context_length) && model.context_length > 0
        ? model.context_length
        : undefined;
    const vision = model.input_modalities?.includes("image") ? { mediaTypes: [...VISION_MEDIA_TYPES] } : undefined;

    byId.set(model.id, {
      id: model.id,
      title: model.display_name?.trim() || model.id,
      description: describeModel(model, contextWindow),
      contextWindow,
      capabilities: {
        systemMessage: { supported: true },
        temperature: { supported: !reasoning },
        streaming: { supported: true },
        tools: { supported: toolsSupported },
        ...(vision ? { vision } : {}),
        ...(reasoning ? { reasoningEffort: reasoningEffortCapability() } : {}),
      },
    });
  }

  return [...byId.values()].sort(
    (left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id),
  );
}

export function buildChatCompletionRequest(model: ProviderModelRef, request: ProviderRequest): ChatCompletionBody {
  const messages = toChatMessages(request);
  if (messages.length === 0) {
    throw new Error("ZenMux needs at least one message.");
  }

  const body: ChatCompletionBody = {
    model: model.id,
    messages,
    stream: true,
    stream_options: { include_usage: true },
  };

  if (
    model.capabilities?.temperature?.supported !== false &&
    typeof request.temperature === "number" &&
    Number.isFinite(request.temperature)
  ) {
    body.temperature = request.temperature;
  }

  const tools = toTools(request.tools);
  if (tools && model.capabilities?.tools?.supported !== false) {
    body.tools = tools;
    if (request.toolChoice) {
      body.tool_choice = request.toolChoice;
    }
  }

  const reasoningEffort = readReasoningEffort(request);
  if (model.capabilities?.reasoningEffort?.supported && reasoningEffort) {
    body.reasoning_effort = reasoningEffort;
  }

  return body;
}

export function takeSseData(buffer: string): { data: string[]; rest: string } {
  const data: string[] = [];
  let eventStart = 0;
  let lineStart = 0;
  let fields: string[] = [];
  // Keep a trailing CR until the next chunk so a split CRLF stays one delimiter.
  const lineEndings = /\r\n|\r(?!$)|\n/g;
  for (const match of buffer.matchAll(lineEndings)) {
    const line = buffer.slice(lineStart, match.index);
    lineStart = match.index + match[0].length;
    if (line === "") {
      if (fields.length > 0) data.push(fields.join("\n"));
      fields = [];
      eventStart = lineStart;
    } else if (line === "data" || line.startsWith("data:")) {
      fields.push(line.slice(5).replace(/^ /, ""));
    }
  }

  return { data, rest: buffer.slice(eventStart) };
}

export async function* readSseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        yield* takeSseData(`${buffer}\n\n`).data;
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const consumed = takeSseData(buffer);
      buffer = consumed.rest;
      yield* consumed.data;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Preserve the original read/parse error if the stream has already failed.
    } finally {
      reader.releaseLock();
    }
  }
}

export function createChatStreamParser() {
  const pending = new Map<number, PendingToolCall>();
  let finishReason: string | undefined;
  let usage: TokenUsage | undefined;
  let sawText = false;
  let sawReasoning = false;

  return {
    push(chunk: unknown): ChatStreamPart[] {
      if (!chunk || typeof chunk !== "object") {
        return [];
      }

      const record = chunk as ChatChunk;
      const errorMessage = extractChunkError(record.error);
      if (errorMessage) {
        throw new Error(errorMessage);
      }

      const parts: ChatStreamPart[] = [];
      const choice = record.choices?.[0];
      const delta = choice?.delta;
      if (typeof choice?.finish_reason === "string" && choice.finish_reason) {
        finishReason = choice.finish_reason;
      }

      if (typeof delta?.content === "string" && delta.content) {
        sawText = true;
        parts.push({ type: "text-delta", id: "text", text: delta.content });
      } else if (typeof delta?.refusal === "string" && delta.refusal) {
        sawText = true;
        parts.push({ type: "text-delta", id: "text", text: delta.refusal });
      }

      const reasoning = reasoningText(delta);
      if (reasoning) {
        sawReasoning = true;
        parts.push({ type: "reasoning-delta", id: "reasoning", text: reasoning });
      }

      for (const call of delta?.tool_calls ?? []) {
        const index = typeof call.index === "number" ? call.index : pending.size;
        const current = pending.get(index) ?? { index, arguments: "" };
        if (call.id) {
          current.id = call.id;
        }
        if (call.function?.name) {
          current.name = current.name ? current.name + call.function.name : call.function.name;
        }
        if (call.function?.arguments) {
          current.arguments += call.function.arguments;
        }
        pending.set(index, current);
      }

      const nextUsage = usageFrom(record.usage);
      if (nextUsage) {
        usage = nextUsage;
      }

      return parts;
    },

    finish(receivedDone = false): ChatStreamPart[] {
      if (!finishReason && !receivedDone) {
        throw new Error("ZenMux stream ended before completion. Please try again.");
      }
      const canCallTools = !finishReason || ["stop", "tool_calls", "function_call"].includes(finishReason);
      const toolCalls = canCallTools ? flushToolCalls(pending) : [];
      if (!sawText && !sawReasoning && toolCalls.length === 0 && !finishReason) {
        throw new Error("ZenMux returned an empty model response.");
      }

      return [
        ...toolCalls,
        {
          type: "finish",
          finishReason: mapFinishReason(finishReason, toolCalls.length > 0),
          ...(usage ? { totalUsage: usage } : {}),
        },
      ];
    },
  };
}

export function partsFromCompletion(payload: unknown): ChatStreamPart[] {
  if (!payload || typeof payload !== "object") {
    throw new Error("ZenMux returned an unreadable model response.");
  }

  const record = payload as {
    error?: unknown;
    choices?: Array<{
      finish_reason?: string | null;
      message?: {
        content?: string | null;
        refusal?: string | null;
        reasoning?: string | null;
        reasoning_content?: string | null;
        tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }>;
      };
    }>;
    usage?: ChatChunk["usage"];
  };
  const choice = record.choices?.[0];
  const parser = createChatStreamParser();
  const streamed = parser.push({
    error: record.error,
    usage: record.usage,
    choices: [
      {
        finish_reason: choice?.finish_reason,
        delta: {
          content: choice?.message?.content,
          refusal: choice?.message?.refusal,
          reasoning: choice?.message?.reasoning,
          reasoning_content: choice?.message?.reasoning_content,
          tool_calls: choice?.message?.tool_calls?.map((call, index) => ({
            index,
            id: call.id,
            function: call.function,
          })),
        },
      },
    ],
  });

  return [...streamed, ...parser.finish()];
}

function catalogArray(payload: unknown): unknown[] | undefined {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return undefined;
  }

  const data = (payload as { data?: unknown }).data;
  return Array.isArray(data) ? data : undefined;
}

function asCatalogModel(value: unknown): ZenMuxCatalogModel | undefined {
  if (!value || typeof value !== "object" || !("id" in value) || typeof value.id !== "string") {
    return undefined;
  }

  const id = value.id.trim();
  if (!id) {
    return undefined;
  }

  const record = value as ZenMuxCatalogModel;
  return {
    id,
    display_name: typeof record.display_name === "string" ? record.display_name : undefined,
    owned_by: typeof record.owned_by === "string" ? record.owned_by : undefined,
    input_modalities: stringArray(record.input_modalities),
    output_modalities: stringArray(record.output_modalities),
    capabilities:
      record.capabilities && typeof record.capabilities === "object"
        ? {
            reasoning: typeof record.capabilities.reasoning === "boolean" ? record.capabilities.reasoning : undefined,
            tools: typeof record.capabilities.tools === "boolean" ? record.capabilities.tools : undefined,
            function_calling:
              typeof record.capabilities.function_calling === "boolean"
                ? record.capabilities.function_calling
                : undefined,
          }
        : undefined,
    context_length: typeof record.context_length === "number" ? record.context_length : undefined,
  };
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.filter((item): item is string => typeof item === "string");
  return items.length > 0 ? items : undefined;
}

function reasoningEffortCapability(): NonNullable<ProvidedModel["capabilities"]["reasoningEffort"]> {
  return {
    supported: true,
    options: [...REASONING_EFFORTS],
    default: DEFAULT_REASONING_EFFORT,
  };
}

function readReasoningEffort(request: ProviderRequest): ReasoningEffort | undefined {
  const value = request.providerOptions?.raycast?.reasoningEffort;
  return isReasoningEffort(value) ? value : undefined;
}

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return typeof value === "string" && REASONING_EFFORTS.some((effort) => effort === value);
}

function isChatModel(model: ZenMuxCatalogModel): boolean {
  if (!model.output_modalities || model.output_modalities.length === 0) {
    return true;
  }

  return model.output_modalities.includes("text");
}

function describeModel(model: ZenMuxCatalogModel, contextWindow?: number): string {
  const owner = model.owned_by?.trim();
  const ownerLabel = owner ? owner.charAt(0).toUpperCase() + owner.slice(1) : "ZenMux";
  if (!contextWindow) {
    return ownerLabel;
  }

  return `${ownerLabel} · ${contextWindow.toLocaleString("en-US")} token context`;
}

function toChatMessages(request: ProviderRequest): ChatMessage[] {
  const messages: ChatMessage[] = [];
  if (request.system?.trim()) {
    messages.push({ role: "system", content: request.system });
  }

  for (const message of request.messages ?? []) {
    if (message.role === "system") {
      if (message.content.trim()) {
        messages.push({ role: "system", content: message.content });
      }
      continue;
    }

    if (message.role === "user") {
      const content = toUserContent(message.content);
      if (content) {
        messages.push({ role: "user", content });
      }
      continue;
    }

    if (message.role === "assistant") {
      const assistant = toAssistantMessage(message.content);
      if (assistant) {
        messages.push(assistant);
      }
      continue;
    }

    for (const result of message.content) {
      if (result.type !== "tool-result" || !result.toolCallId) {
        continue;
      }

      messages.push({
        role: "tool",
        tool_call_id: result.toolCallId,
        content: formatToolOutput(result.output),
      });
    }
  }

  return messages;
}

function toUserContent(parts: Array<TextPart | FilePart>): string | Array<Record<string, unknown>> | undefined {
  const content: Array<Record<string, unknown>> = [];
  const text: string[] = [];

  for (const part of parts) {
    if (part.type === "text") {
      if (part.text) {
        text.push(part.text);
        content.push({ type: "text", text: part.text });
      }
      continue;
    }

    const url = toImageUrl(part);
    if (url) {
      content.push({ type: "image_url", image_url: { url } });
    }
  }

  if (content.length === 0) {
    return undefined;
  }

  if (content.every((part) => part.type === "text")) {
    return text.join("");
  }

  return content;
}

function toImageUrl(part: FilePart): string | undefined {
  if (!part.mediaType.startsWith("image/")) {
    return undefined;
  }

  const data = part.data;
  if (data instanceof URL) {
    return data.toString();
  }

  if (typeof data === "string") {
    if (data.startsWith("data:") || data.startsWith("http://") || data.startsWith("https://")) {
      return data;
    }

    return `data:${part.mediaType};base64,${data}`;
  }

  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  return `data:${part.mediaType};base64,${Buffer.from(bytes).toString("base64")}`;
}

function toAssistantMessage(
  parts: Array<TextPart | FilePart | ReasoningPart | ToolCallPart>,
): Extract<ChatMessage, { role: "assistant" }> | undefined {
  const text: string[] = [];
  const reasoning: string[] = [];
  const toolCalls: NonNullable<Extract<ChatMessage, { role: "assistant" }>["tool_calls"]> = [];

  for (const part of parts) {
    if (part.type === "text" && part.text) {
      text.push(part.text);
    } else if (part.type === "reasoning" && part.text) {
      reasoning.push(part.text);
    } else if (part.type === "tool-call" && part.toolName) {
      toolCalls.push({
        id: part.toolCallId || `call_${toolCalls.length}`,
        type: "function",
        function: {
          name: part.toolName,
          arguments: typeof part.input === "string" ? part.input : JSON.stringify(part.input ?? {}),
        },
      });
    }
  }

  if (text.length === 0 && reasoning.length === 0 && toolCalls.length === 0) {
    return undefined;
  }

  return {
    role: "assistant",
    content: text.length > 0 ? text.join("") : null,
    ...(reasoning.length > 0 ? { reasoning: reasoning.join("") } : {}),
    ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
  };
}

function formatToolOutput(output: ToolResultPart["output"]): string {
  const value =
    output && typeof output === "object" && "type" in output && output.type === "json" && "value" in output
      ? output.value
      : output;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function toTools(tools: ProviderRequest["tools"]): ChatCompletionBody["tools"] | undefined {
  const entries = Object.entries(tools ?? {});
  if (entries.length === 0) {
    return undefined;
  }

  return entries.map(([name, tool]) => ({
    type: "function" as const,
    function: {
      name,
      ...(tool.description ? { description: tool.description } : {}),
      parameters:
        tool.inputSchema && typeof tool.inputSchema === "object"
          ? tool.inputSchema
          : { type: "object", properties: {} },
    },
  }));
}

function extractChunkError(error: unknown): string | undefined {
  if (!error) {
    return undefined;
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (typeof error === "object" && "message" in error && typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }

  return "ZenMux model request failed.";
}

function reasoningText(delta: NonNullable<ChatChunk["choices"]>[number]["delta"]): string | undefined {
  if (!delta) {
    return undefined;
  }

  if (typeof delta.reasoning === "string" && delta.reasoning) {
    return delta.reasoning;
  }

  if (typeof delta.reasoning_content === "string" && delta.reasoning_content) {
    return delta.reasoning_content;
  }

  const details = delta.reasoning_details
    ?.map((detail) => (typeof detail.text === "string" ? detail.text : ""))
    .join("");
  return details || undefined;
}

function usageFrom(usage: ChatChunk["usage"]): TokenUsage | undefined {
  if (!usage) {
    return undefined;
  }

  const totalUsage: TokenUsage = {};
  if (typeof usage.prompt_tokens === "number") {
    totalUsage.inputTokens = usage.prompt_tokens;
  }
  if (typeof usage.completion_tokens === "number") {
    totalUsage.outputTokens = usage.completion_tokens;
  }
  if (typeof usage.total_tokens === "number") {
    totalUsage.totalTokens = usage.total_tokens;
  }

  return Object.keys(totalUsage).length > 0 ? totalUsage : undefined;
}

function flushToolCalls(pending: Map<number, PendingToolCall>): ChatStreamPart[] {
  return [...pending.values()]
    .sort((left, right) => left.index - right.index)
    .flatMap((call) => {
      if (!call.name || !call.id) {
        throw new Error("ZenMux returned an incomplete tool call.");
      }

      let input: unknown;
      try {
        input = JSON.parse(call.arguments) as unknown;
      } catch {
        throw new Error("ZenMux returned invalid JSON arguments for a tool call.");
      }

      return [
        {
          type: "tool-call" as const,
          toolCallId: call.id,
          toolName: call.name,
          input,
        },
      ];
    });
}

function mapFinishReason(
  reason: string | undefined,
  hasToolCalls: boolean,
): Extract<ChatStreamPart, { type: "finish" }>["finishReason"] {
  switch (reason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "content_filter":
      return "content-filter";
    case "tool_calls":
    case "function_call":
      return "tool-calls";
    case "error":
      return "error";
    default:
      return hasToolCalls ? "tool-calls" : reason ? "other" : "stop";
  }
}
