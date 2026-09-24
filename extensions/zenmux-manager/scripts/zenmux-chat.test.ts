import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ZenMuxModelConfigError,
  buildChatCompletionRequest,
  createChatStreamParser,
  modelAccessError,
  parseModelCatalog,
  partsFromCompletion,
  readApiErrorMessage,
  requireModelApiKey,
  takeSseData,
  toRegisteredModels,
} from "../src/zenmux-chat";

describe("ZenMux model catalog", () => {
  it("keeps text models and maps capabilities", () => {
    const models = toRegisteredModels(
      parseModelCatalog({
        data: [
          {
            id: "openai/gpt-5.2",
            display_name: "OpenAI: GPT-5.2",
            owned_by: "openai",
            input_modalities: ["text", "image"],
            output_modalities: ["text"],
            capabilities: { reasoning: true },
            context_length: 400000,
          },
          {
            id: "vendor/image-only",
            display_name: "Image only",
            output_modalities: ["image"],
          },
          {
            id: "anthropic/claude-sonnet",
            display_name: "Claude Sonnet",
            owned_by: "anthropic",
            input_modalities: ["text"],
            output_modalities: ["text"],
            capabilities: { reasoning: false, tools: false },
            context_length: 200000,
          },
          {
            id: "openai/gpt-5.2",
            display_name: "Duplicate",
          },
        ],
      }),
    );

    assert.deepEqual(
      models.map((model) => model.id),
      ["anthropic/claude-sonnet", "openai/gpt-5.2"],
    );
    assert.equal(models[1]?.capabilities.temperature.supported, false);
    assert.deepEqual(models[1]?.capabilities.reasoningEffort, {
      supported: true,
      options: ["minimal", "low", "medium", "high"],
      default: "medium",
    });
    assert.equal(models[0]?.capabilities.reasoningEffort, undefined);
    assert.equal(models[1]?.capabilities.tools.supported, true);
    assert.deepEqual(models[1]?.capabilities.vision?.mediaTypes, [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ]);
    assert.equal(models[1]?.contextWindow, 400000);
    assert.equal(models[0]?.capabilities.temperature.supported, true);
    assert.equal(models[0]?.capabilities.tools.supported, false);
    assert.equal(models[0]?.capabilities.vision, undefined);
  });

  it("rejects a catalog without a data array", () => {
    assert.throws(() => parseModelCatalog({ models: [] }), /unexpected model list/);
  });
});

describe("ZenMux chat request", () => {
  it("converts Raycast messages and omits temperature for reasoning models", () => {
    const body = buildChatCompletionRequest(
      {
        id: "openai/gpt-5.2",
        capabilities: { temperature: { supported: false }, tools: { supported: true } },
      },
      {
        system: "Be brief",
        temperature: 0.2,
        toolChoice: "auto",
        tools: {
          lookup: {
            description: "Look something up",
            inputSchema: { type: "object", properties: { q: { type: "string" } } },
          },
        },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "hi" },
              { type: "file", data: "AAAA", mediaType: "image/png" },
              { type: "file", data: "pdf", mediaType: "application/pdf" },
            ],
          },
          {
            role: "assistant",
            content: [
              { type: "reasoning", text: "think" },
              { type: "tool-call", toolCallId: "call_1", toolName: "lookup", input: { q: "x" } },
            ],
          },
          {
            role: "tool",
            content: [
              { type: "tool-result", toolCallId: "call_1", toolName: "lookup", output: { type: "json", value: { ok: true } } },
            ],
          },
        ],
      },
    );

    assert.equal(body.model, "openai/gpt-5.2");
    assert.equal(body.stream, true);
    assert.equal(body.temperature, undefined);
    assert.equal(body.tool_choice, "auto");
    assert.deepEqual(body.messages, [
      { role: "system", content: "Be brief" },
      {
        role: "user",
        content: [
          { type: "text", text: "hi" },
          { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
        ],
      },
      {
        role: "assistant",
        content: null,
        reasoning: "think",
        tool_calls: [{ id: "call_1", type: "function", function: { name: "lookup", arguments: '{"q":"x"}' } }],
      },
      { role: "tool", tool_call_id: "call_1", content: '{"ok":true}' },
    ]);
  });

  it("sends temperature when the model accepts it", () => {
    const body = buildChatCompletionRequest(
      { id: "plain", capabilities: { temperature: { supported: true } } },
      {
        temperature: 0.4,
        messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
      },
    );

    assert.equal(body.temperature, 0.4);
    assert.equal(body.messages[0]?.content, "Hello");
    assert.equal(body.reasoning_effort, undefined);
  });

  it("sends ZenMux reasoning effort for models that support it", () => {
    const body = buildChatCompletionRequest(
      {
        id: "x-ai/grok-4.7",
        capabilities: { temperature: { supported: false }, reasoningEffort: { supported: true } },
      },
      {
        providerOptions: { raycast: { reasoningEffort: "high" } },
        temperature: 0.2,
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      },
    );

    assert.equal(body.reasoning_effort, "high");
    assert.equal(body.temperature, undefined);
  });

  it("drops reasoning effort the model or ZenMux does not accept", () => {
    const unsupported = buildChatCompletionRequest(
      { id: "plain", capabilities: { temperature: { supported: true } } },
      {
        providerOptions: { raycast: { reasoningEffort: "high" } },
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      },
    );
    const unknown = buildChatCompletionRequest(
      { id: "x-ai/grok-4.7", capabilities: { reasoningEffort: { supported: true } } },
      {
        providerOptions: { raycast: { reasoningEffort: "xhigh" } },
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      },
    );

    assert.equal(unsupported.reasoning_effort, undefined);
    assert.equal(unknown.reasoning_effort, undefined);
  });
});

describe("ZenMux chat stream", () => {
  it("reassembles split server-sent events", () => {
    const first = takeSseData('data: {"choices":[{"delta":{"content":"Hel');
    assert.deepEqual(first.data, []);
    const second = takeSseData(`${first.rest}lo"}}]}\n\ndata: [DONE]\n`);
    assert.deepEqual(second.data, ['{"choices":[{"delta":{"content":"Hello"}}]}', "[DONE]"]);
  });

  it("streams text, reasoning, tool calls, and usage", () => {
    const parser = createChatStreamParser();
    const text = parser.push({
      choices: [{ delta: { content: "Hello", reasoning_content: "Because" }, finish_reason: null }],
    });
    const tools = parser.push({
      choices: [
        {
          delta: {
            tool_calls: [{ index: 0, id: "call_1", function: { name: "lookup", arguments: '{"q":' } }],
          },
          finish_reason: null,
        },
      ],
    });
    parser.push({
      choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"x"}' } }] }, finish_reason: "tool_calls" }],
      usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
    });
    const finished = parser.finish();

    assert.deepEqual(text, [
      { type: "text-delta", id: "text", text: "Hello" },
      { type: "reasoning-delta", id: "reasoning", text: "Because" },
    ]);
    assert.deepEqual(tools, []);
    assert.deepEqual(finished, [
      { type: "tool-call", toolCallId: "call_1", toolName: "lookup", input: { q: "x" } },
      {
        type: "finish",
        finishReason: "tool-calls",
        totalUsage: { inputTokens: 3, outputTokens: 4, totalTokens: 7 },
      },
    ]);
  });

  it("reads a non-streaming completion payload", () => {
    assert.deepEqual(
      partsFromCompletion({
        choices: [{ message: { content: "Done" }, finish_reason: "stop" }],
      }),
      [
        { type: "text-delta", id: "text", text: "Done" },
        { type: "finish", finishReason: "stop" },
      ],
    );
  });

  it("surfaces provider errors", () => {
    const parser = createChatStreamParser();
    assert.throws(() => parser.push({ error: { message: "model offline" } }), /model offline/);
    assert.equal(readApiErrorMessage(400, JSON.stringify({ error: { message: "bad model" } })), "400 bad model");
  });
});

describe("ZenMux model key", () => {
  it("requires a model key and does not echo rejected credentials", () => {
    assert.throws(() => requireModelApiKey("  "), ZenMuxModelConfigError);
    const error = modelAccessError(401, JSON.stringify({ error: { message: "bad key sk-secret" } }));
    assert.equal(error instanceof ZenMuxModelConfigError, true);
    assert.equal(error.message.includes("sk-secret"), false);
    assert.match(error.message, /Platform API key/);
  });
});
