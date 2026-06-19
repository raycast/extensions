import { HttpClient } from "../http/HttpClient";
import type {
  ZoChatRequest,
  ZoChatResponse,
  ZoChatStreamDeltaKind,
  ZoModel,
  ZoStructuredAskOutput,
} from "../../types/domain";

type ZoApiClientOptions = {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  maxRetries: number;
};

type RawModelEntry = string | Record<string, unknown>;

type RawModelsResponse =
  | RawModelEntry[]
  | {
      models?: RawModelEntry[];
      data?: RawModelEntry[];
      items?: RawModelEntry[];
      results?: RawModelEntry[];
      [key: string]: unknown;
    };

type RawChatResponse = {
  output?: unknown;
  conversation_id?: string;
  error?: string;
  [key: string]: unknown;
};

type ParsedChatOutput = {
  outputText: string;
  thinkingText?: string;
};

type StreamDelta = {
  kind: ZoChatStreamDeltaKind;
  text: string;
};

type ParsedStreamFinalOutput = ParsedChatOutput & {
  structured: boolean;
};

const ASK_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  description:
    "Return answer and thinking separately. answer must contain only user-facing markdown, never reasoning text or XML/HTML tags such as <thinking> or <details>.",
  required: ["answer", "thinking"],
  additionalProperties: false,
  properties: {
    answer: {
      type: "string",
      description:
        "Final response shown to the user in rich markdown. Do not include reasoning or hidden internal thoughts.",
    },
    thinking: {
      type: "string",
      description: "Internal reasoning text only. Use an empty string when there is no hidden reasoning to return.",
    },
  },
};

const FINAL_EVENT_MARKERS = ["final", "final_result", "finalresult", "finalresultevent", "final_output"];

const STREAM_EVENT_FRONTEND_MODEL_RESPONSE = "frontendmodelresponse";
const STREAM_EVENT_END = "end";
const STREAM_EVENT_ERROR = "error";

class UnexpectedAskOutputFormatError extends Error {
  constructor(reason: string, rawPreview?: string) {
    const detail = rawPreview ? ` (${rawPreview})` : "";
    super(`Unexpected Zo Ask output format: ${reason}${detail}`);
    this.name = "UnexpectedAskOutputFormatError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function normalizeStructuredText(text: string): string {
  return normalizeLineEndings(text);
}

function normalizeSseEventName(eventName: string | undefined): string | undefined {
  if (!eventName) {
    return undefined;
  }

  const trimmed = eventName.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toOptionalThinking(text: string): string | undefined {
  return text.trim().length > 0 ? text : undefined;
}

function summarizeRaw(value: unknown): string {
  if (typeof value === "string") {
    return value.length > 180 ? `${value.slice(0, 177)}...` : value;
  }

  try {
    const json = JSON.stringify(value);
    if (!json) {
      return "";
    }
    return json.length > 180 ? `${json.slice(0, 177)}...` : json;
  } catch {
    return "";
  }
}

function parseStructuredOutputCandidate(value: unknown): ZoStructuredAskOutput | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return parseStructuredOutputCandidate(parsed);
    } catch {
      return undefined;
    }
  }

  if (!isRecord(value)) {
    return undefined;
  }

  if (typeof value.answer !== "string" || typeof value.thinking !== "string") {
    return undefined;
  }

  return {
    answer: normalizeStructuredText(value.answer),
    thinking: normalizeStructuredText(value.thinking),
  };
}

function findStructuredOutput(value: unknown, depth = 0): ZoStructuredAskOutput | undefined {
  if (depth > 4) {
    return undefined;
  }

  const direct = parseStructuredOutputCandidate(value);
  if (direct) {
    return direct;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const keys = ["output", "result", "final_result", "finalResult", "final", "response", "data", "value"];

  for (const key of keys) {
    const nested = findStructuredOutput(value[key], depth + 1);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function extractExplicitThinkingTags(content: string): ParsedChatOutput {
  const normalizedContent = normalizeLineEndings(content);
  let outputText = normalizedContent;
  const thinkingChunks: string[] = [];

  outputText = outputText.replace(/<(thinking|think|reasoning)>([\s\S]*?)<\/\1>/gi, (_m, _t, body) => {
    thinkingChunks.push(normalizeLineEndings(String(body)));
    return "";
  });

  outputText = outputText.replace(
    /<details>\s*<summary>\s*thinking\s*<\/summary>([\s\S]*?)<\/details>/gi,
    (_m, body) => {
      thinkingChunks.push(normalizeLineEndings(String(body)));
      return "";
    },
  );

  const thinkingText = thinkingChunks.join("\n\n");
  if (thinkingText.trim().length === 0) {
    return {
      outputText,
    };
  }

  return {
    outputText,
    thinkingText: thinkingText,
  };
}

function parseChatOutput(raw: RawChatResponse): ParsedChatOutput {
  const structuredFromOutput = findStructuredOutput(raw.output);
  if (structuredFromOutput) {
    return {
      outputText: structuredFromOutput.answer,
      thinkingText: toOptionalThinking(structuredFromOutput.thinking),
    };
  }

  if (typeof raw.output === "string") {
    const explicitTagSplit = extractExplicitThinkingTags(raw.output);
    return {
      outputText: explicitTagSplit.outputText,
      thinkingText: toOptionalThinking(explicitTagSplit.thinkingText ?? ""),
    };
  }

  throw new UnexpectedAskOutputFormatError(
    "expected output to contain JSON with string fields {answer, thinking}",
    summarizeRaw(raw.output),
  );
}

function normalizeModelEntry(entry: RawModelEntry): ZoModel {
  if (typeof entry === "string") {
    return {
      id: entry,
      label: entry,
    };
  }

  const id =
    readString(entry, [
      "id",
      "model",
      "model_id",
      "model_name",
      "modelId",
      "name",
      "slug",
      "key",
      "value",
      "identifier",
    ]) ??
    readStringByKeyPattern(entry, ["model", "id", "key"]) ??
    "unknown-model";

  const label = readString(entry, ["label", "title", "display_name", "displayName", "name", "model"]) ?? id;

  const description = readString(entry, ["description", "desc", "summary", "details"]);

  return {
    id,
    label,
    description,
    isDefault: readBoolean(entry, ["default", "isDefault", "is_default", "recommended"]),
  };
}

function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function readRawString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return normalizeLineEndings(value);
    }
  }

  return undefined;
}

function readBoolean(record: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
  }

  return undefined;
}

function readStringByKeyPattern(record: Record<string, unknown>, patterns: string[]): string | undefined {
  const entries = Object.entries(record);
  for (const [key, value] of entries) {
    const loweredKey = key.toLowerCase();
    const matches = patterns.some((pattern) => loweredKey.includes(pattern));
    if (!matches) {
      continue;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function extractModelEntries(raw: RawModelsResponse): RawModelEntry[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  return raw.models ?? raw.data ?? raw.items ?? raw.results ?? [];
}

function dedupeModels(models: ZoModel[]): ZoModel[] {
  const seen = new Set<string>();
  const unique: ZoModel[] = [];

  for (const model of models) {
    if (seen.has(model.id)) {
      continue;
    }

    seen.add(model.id);
    unique.push(model);
  }

  return unique;
}

function inferDeltaKindFromValue(value: unknown): ZoChatStreamDeltaKind {
  if (typeof value !== "string") {
    return "answer";
  }

  const lowered = value.toLowerCase();
  if (
    lowered.includes("thinking") ||
    lowered.includes("reason") ||
    lowered.includes("analysis") ||
    lowered.includes("thought")
  ) {
    return "thinking";
  }

  return "answer";
}

function inferDeltaKindFromRecord(record: Record<string, unknown>): ZoChatStreamDeltaKind {
  const candidates = [record.event_kind, record.part_kind, record.kind, record.type, record.role];

  for (const candidate of candidates) {
    if (inferDeltaKindFromValue(candidate) === "thinking") {
      return "thinking";
    }
  }

  return "answer";
}

function isFinalStreamEvent(payload: unknown): boolean {
  if (!isRecord(payload)) {
    return false;
  }

  const candidates = [payload.event_kind, payload.eventKind, payload.event, payload.type, payload.kind, payload.name];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const lowered = candidate.toLowerCase();
    if (FINAL_EVENT_MARKERS.some((marker) => lowered.includes(marker))) {
      return true;
    }
  }

  if ("final_result" in payload || "finalResult" in payload) {
    return true;
  }

  return false;
}

function extractFinalStructuredOutput(payload: unknown): ZoStructuredAskOutput | undefined {
  const direct = parseStructuredOutputCandidate(payload);
  if (direct) {
    return direct;
  }

  if (!isRecord(payload)) {
    return undefined;
  }

  const directCandidates = [
    payload.output,
    payload.final_result,
    payload.finalResult,
    payload.result,
    payload.response,
  ];

  for (const candidate of directCandidates) {
    const parsed = parseStructuredOutputCandidate(candidate);
    if (parsed && (candidate === payload.final_result || candidate === payload.finalResult)) {
      return parsed;
    }

    if (parsed && isFinalStreamEvent(payload)) {
      return parsed;
    }
  }

  if (!isFinalStreamEvent(payload)) {
    return undefined;
  }

  return findStructuredOutput(payload);
}

function parseFinalOutputValue(value: unknown, depth = 0): ParsedStreamFinalOutput | undefined {
  if (depth > 4) {
    return undefined;
  }

  const structured = findStructuredOutput(value);
  if (structured) {
    return {
      outputText: structured.answer,
      thinkingText: toOptionalThinking(structured.thinking),
      structured: true,
    };
  }

  if (typeof value === "string") {
    const split = extractExplicitThinkingTags(value);
    return {
      outputText: split.outputText,
      thinkingText: toOptionalThinking(split.thinkingText ?? ""),
      structured: false,
    };
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const keys = ["output", "data", "result", "response", "final_result", "finalResult", "final", "value", "content"];

  for (const key of keys) {
    const parsed = parseFinalOutputValue(value[key], depth + 1);
    if (parsed) {
      return parsed;
    }
  }

  return undefined;
}

function extractFinalOutputFromStreamPayload(
  payload: unknown,
  eventName?: string,
): ParsedStreamFinalOutput | undefined {
  const normalizedEventName = normalizeSseEventName(eventName);
  if (normalizedEventName === STREAM_EVENT_END) {
    return parseFinalOutputValue(payload);
  }

  const structured = extractFinalStructuredOutput(payload);
  if (structured) {
    return {
      outputText: structured.answer,
      thinkingText: toOptionalThinking(structured.thinking),
      structured: true,
    };
  }

  return undefined;
}

function findConversationId(value: unknown, depth = 0): string | undefined {
  if (depth > 4 || !isRecord(value)) {
    return undefined;
  }

  const direct = readRawString(value, ["conversation_id", "conversationId"]);
  if (direct) {
    return direct;
  }

  const keys = ["data", "output", "result", "response", "final_result", "finalResult", "final"];
  for (const key of keys) {
    const nested = findConversationId(value[key], depth + 1);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function extractStreamErrorMessage(payload: unknown, depth = 0): string | undefined {
  if (depth > 4 || !isRecord(payload)) {
    return undefined;
  }

  const explicitError = readRawString(payload, ["error", "error_message", "errorMessage"]);
  if (explicitError) {
    return explicitError;
  }

  const status = readRawString(payload, ["status"]);
  if (status?.toLowerCase() === "error") {
    const statusMessage = readRawString(payload, ["message", "detail", "text"]);
    if (statusMessage) {
      return statusMessage;
    }
  }

  const kindCandidate = readRawString(payload, ["event_kind", "event", "type", "kind"]);
  if (kindCandidate?.toLowerCase().includes("error")) {
    const kindMessage = readRawString(payload, ["message", "detail", "text"]);
    if (kindMessage) {
      return kindMessage;
    }
  }

  const keys = ["data", "result", "response", "error_data", "errorData"];
  for (const key of keys) {
    const nested = extractStreamErrorMessage(payload[key], depth + 1);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function extractStreamDelta(payload: unknown): StreamDelta | undefined {
  if (typeof payload === "string") {
    return payload.length > 0
      ? {
          kind: "answer",
          text: normalizeLineEndings(payload),
        }
      : undefined;
  }

  if (!isRecord(payload)) {
    return undefined;
  }

  if (payload.event_kind === "part_delta" && isRecord(payload.delta) && payload.delta !== null) {
    const thinkingDelta = readRawString(payload.delta, [
      "thinking_delta",
      "reasoning_delta",
      "analysis_delta",
      "thought_delta",
    ]);
    if (thinkingDelta) {
      return {
        kind: "thinking",
        text: thinkingDelta,
      };
    }

    const contentDelta =
      readRawString(payload.delta, ["content_delta", "delta", "text", "output_text", "content"]) ??
      readRawString(payload.delta, ["token"]);
    if (contentDelta) {
      return {
        kind: "answer",
        text: contentDelta,
      };
    }
  }

  if (
    payload.event_kind === "part_start" &&
    isRecord(payload.part) &&
    payload.part !== null &&
    typeof payload.part.content === "string"
  ) {
    return {
      kind: inferDeltaKindFromRecord(payload.part),
      text: normalizeLineEndings(payload.part.content),
    };
  }

  if (isRecord(payload.data)) {
    const thinkingFromData = readRawString(payload.data, [
      "thinking_delta",
      "reasoning_delta",
      "analysis_delta",
      "thought_delta",
      "thinking",
      "reasoning",
    ]);
    if (thinkingFromData) {
      return {
        kind: "thinking",
        text: thinkingFromData,
      };
    }

    const contentFromData =
      readRawString(payload.data, ["content", "content_delta", "delta", "text", "output_text"]) ??
      readRawString(payload.data, ["token"]);

    if (contentFromData) {
      return {
        kind: inferDeltaKindFromRecord(payload.data),
        text: contentFromData,
      };
    }
  }

  const fallbackThinking = readRawString(payload, [
    "thinking_delta",
    "reasoning_delta",
    "analysis_delta",
    "thought_delta",
  ]);
  if (fallbackThinking) {
    return {
      kind: "thinking",
      text: fallbackThinking,
    };
  }

  const fallbackDelta = readRawString(payload, ["delta", "text", "token", "output_text", "content"]);
  if (fallbackDelta) {
    return {
      kind: inferDeltaKindFromRecord(payload),
      text: fallbackDelta,
    };
  }

  if (Array.isArray(payload.choices) && payload.choices.length > 0 && isRecord(payload.choices[0])) {
    const first = payload.choices[0];
    if (typeof first.text === "string" && first.text.length > 0) {
      return {
        kind: inferDeltaKindFromRecord(first),
        text: normalizeLineEndings(first.text),
      };
    }

    if (isRecord(first.delta)) {
      const choiceDelta =
        readRawString(first.delta, ["content", "text", "delta", "output_text"]) ??
        readRawString(first.delta, ["token"]);
      if (choiceDelta) {
        return {
          kind: inferDeltaKindFromRecord(first.delta),
          text: choiceDelta,
        };
      }
    }
  }

  return undefined;
}

function extractInputFromMessages(messages: ZoChatRequest["messages"]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) {
      continue;
    }

    if (message.role === "user" && message.content.trim().length > 0) {
      return message.content.trim();
    }
  }

  return "";
}

export class ZoApiClient {
  private readonly http: HttpClient;
  private readonly options: ZoApiClientOptions;

  constructor(options: ZoApiClientOptions) {
    this.options = options;
    this.http = new HttpClient({
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
    });
  }

  async ping(): Promise<void> {
    await this.listModels();
  }

  async listModels(): Promise<ZoModel[]> {
    const raw = await this.http.get<RawModelsResponse>("/models/available");
    const entries = extractModelEntries(raw);
    const normalizedModels = entries.map((entry) => normalizeModelEntry(entry));
    return dedupeModels(normalizedModels);
  }

  async chat(request: ZoChatRequest): Promise<ZoChatResponse> {
    const input = extractInputFromMessages(request.messages);
    if (!input) {
      throw new Error("No user input provided for chat request.");
    }

    const body: Record<string, unknown> = {
      input,
      stream: request.stream ?? false,
      output_format: ASK_OUTPUT_SCHEMA,
    };

    if (request.model.trim().length > 0) {
      body.model_name = request.model;
    }

    if (request.conversationId && request.conversationId.trim().length > 0) {
      body.conversation_id = request.conversationId;
    }

    const raw = await this.http.post<RawChatResponse>("/zo/ask", body);
    if (typeof raw.error === "string" && raw.error.length > 0) {
      throw new Error(raw.error);
    }

    const parsedOutput = parseChatOutput(raw);

    return {
      model: request.model,
      conversationId: raw.conversation_id,
      outputText: parsedOutput.outputText,
      thinkingText: parsedOutput.thinkingText,
      raw,
    };
  }

  async chatStream(
    request: ZoChatRequest,
    onDelta: (delta: string, kind?: ZoChatStreamDeltaKind) => void,
  ): Promise<ZoChatResponse> {
    const input = extractInputFromMessages(request.messages);
    if (!input) {
      throw new Error("No user input provided for chat request.");
    }

    const body: Record<string, unknown> = {
      input,
      stream: true,
      output_format: ASK_OUTPUT_SCHEMA,
    };

    if (request.model.trim().length > 0) {
      body.model_name = request.model;
    }

    if (request.conversationId && request.conversationId.trim().length > 0) {
      body.conversation_id = request.conversationId;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutMs);
    let response: Response;

    try {
      response = await fetch(`${this.options.baseUrl}/zo/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
          "x-api-key": this.options.apiKey,
        },
        body: JSON.stringify(body),
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

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Streaming response body is unavailable.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let conversationId = response.headers.get("x-conversation-id") ?? undefined;
    let buffer = "";
    let outputText = "";
    let thinkingText = "";
    let finalOutput: ParsedStreamFinalOutput | undefined;
    let pendingEventName: string | undefined;
    let pendingDataLines: string[] = [];

    const applyDelta = (delta: StreamDelta) => {
      if (delta.kind === "thinking") {
        thinkingText += delta.text;
      } else {
        outputText += delta.text;
      }

      onDelta(delta.text, delta.kind);
    };

    const processStreamPayload = (payloadString: string, eventName?: string) => {
      const normalizedEventName = normalizeSseEventName(eventName);
      if (payloadString === "[DONE]") {
        return;
      }

      let parsedPayload: unknown = payloadString;
      try {
        parsedPayload = JSON.parse(payloadString) as unknown;
      } catch {
        // Raw text payload fallback.
      }

      if (normalizedEventName === STREAM_EVENT_ERROR) {
        const streamError =
          extractStreamErrorMessage(parsedPayload) ??
          (isRecord(parsedPayload) ? readRawString(parsedPayload, ["message", "detail", "text"]) : undefined) ??
          (typeof parsedPayload === "string" ? parsedPayload : "Zo stream returned an error event.");
        throw new Error(streamError);
      }

      const streamConversationId = findConversationId(parsedPayload);
      if (streamConversationId) {
        conversationId = streamConversationId;
      }

      const finalFromPayload = extractFinalOutputFromStreamPayload(parsedPayload, normalizedEventName);
      if (finalFromPayload) {
        finalOutput = finalFromPayload;
        return;
      }

      if (normalizedEventName === STREAM_EVENT_END) {
        return;
      }

      if (normalizedEventName === STREAM_EVENT_FRONTEND_MODEL_RESPONSE) {
        const frontendDelta = extractStreamDelta(parsedPayload);
        if (frontendDelta && frontendDelta.text.length > 0) {
          applyDelta(frontendDelta);
        }
        return;
      }

      const streamError = extractStreamErrorMessage(parsedPayload);
      if (streamError) {
        throw new Error(streamError);
      }

      const delta = extractStreamDelta(parsedPayload);
      if (!delta || delta.text.length === 0) {
        return;
      }

      applyDelta(delta);
    };

    const dispatchPendingFrame = () => {
      if (pendingDataLines.length === 0) {
        pendingEventName = undefined;
        return;
      }

      const frameEventName = pendingEventName;
      const payloadString = pendingDataLines.join("\n");
      pendingEventName = undefined;
      pendingDataLines = [];
      processStreamPayload(payloadString, frameEventName);
    };

    const processStreamLine = (line: string) => {
      const normalizedLine = line.replace(/\r$/, "");

      if (normalizedLine.length === 0) {
        dispatchPendingFrame();
        return;
      }

      if (normalizedLine.startsWith(":")) {
        return;
      }

      if (normalizedLine.startsWith("event:")) {
        pendingEventName = normalizedLine.slice(6).trim();
        return;
      }

      if (normalizedLine.startsWith("data:")) {
        let payload = normalizedLine.slice(5);
        if (payload.startsWith(" ")) {
          payload = payload.slice(1);
        }

        if (!pendingEventName && pendingDataLines.length > 0) {
          // Compatibility mode for line-delimited streams that omit blank separators.
          dispatchPendingFrame();
        }

        pendingDataLines.push(payload);
        return;
      }

      if (pendingDataLines.length > 0) {
        dispatchPendingFrame();
      }

      processStreamPayload(normalizedLine, pendingEventName);
      pendingEventName = undefined;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        processStreamLine(line);
      }
    }

    buffer += decoder.decode();
    if (buffer.length > 0) {
      const lines = buffer.split(/\r?\n/);
      for (const line of lines) {
        processStreamLine(line);
      }
    }
    dispatchPendingFrame();

    if (finalOutput) {
      return {
        outputText: finalOutput.outputText,
        thinkingText: finalOutput.thinkingText,
        raw: { streamed: true, structured: finalOutput.structured },
        model: request.model,
        conversationId,
      };
    }

    const explicitTagSplit = extractExplicitThinkingTags(outputText);
    outputText = explicitTagSplit.outputText;
    if (explicitTagSplit.thinkingText) {
      thinkingText += explicitTagSplit.thinkingText;
    }

    if (outputText.length === 0 && thinkingText.length === 0) {
      throw new UnexpectedAskOutputFormatError("stream ended without structured output or text deltas");
    }

    return {
      outputText,
      thinkingText: toOptionalThinking(thinkingText),
      raw: { streamed: true, structured: false },
      model: request.model,
      conversationId,
    };
  }
}
