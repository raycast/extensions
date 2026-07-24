import { afterEach, describe, expect, it, vi } from "vitest";
import { ZoApiClient } from "../../src/core/api/ZoApiClient";

function createClient() {
  return new ZoApiClient({
    baseUrl: "https://api.example.com",
    apiKey: "test-key",
    timeoutMs: 5000,
    maxRetries: 0,
  });
}

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function createSseResponse(lines: string[], headers?: HeadersInit): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers,
  });
}

function parseJsonRequestBody(init: RequestInit): Record<string, unknown> {
  if (typeof init.body !== "string") {
    throw new Error("Expected request body to be a JSON string.");
  }

  return JSON.parse(init.body) as Record<string, unknown>;
}

describe("ZoApiClient chat parsing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("parses non-stream structured object output", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        output: {
          answer: "Hello **world**",
          thinking: "internal notes",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createClient();
    const response = await client.chat({
      model: "kimi",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(response.outputText).toBe("Hello **world**");
    expect(response.thinkingText).toBe("internal notes");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestBody = parseJsonRequestBody(init);
    expect(requestBody.output_format).toMatchObject({
      type: "object",
      required: ["answer", "thinking"],
    });
  });

  it("parses non-stream stringified structured output", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        output: JSON.stringify({
          answer: "Rendered answer",
          thinking: "Rendered thinking",
        }),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createClient();
    const response = await client.chat({
      model: "kimi",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(response.outputText).toBe("Rendered answer");
    expect(response.thinkingText).toBe("Rendered thinking");
  });

  it("parses non-stream plain string output as final answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        output: "Rendered answer only",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createClient();
    const response = await client.chat({
      model: "kimi",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(response.outputText).toBe("Rendered answer only");
    expect(response.thinkingText).toBeUndefined();
  });

  it("throws when structured output is invalid", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        output: {
          answer: "Missing thinking key",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createClient();
    await expect(
      client.chat({
        model: "kimi",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow("Unexpected Zo Ask output format");
  });

  it("parses docs-style FrontendModelResponse and End stream events", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createSseResponse([
        `event: FrontendModelResponse\ndata: ${JSON.stringify({
          content: "intermediate ",
        })}\n\n`,
        `event: FrontendModelResponse\ndata: ${JSON.stringify({
          data: {
            content: "chunk",
          },
        })}\n\n`,
        `event: End\ndata: ${JSON.stringify({
          data: {
            conversation_id: "conv-end",
            output: {
              answer: "Final answer",
              thinking: "Final thinking",
            },
          },
        })}\n\n`,
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const onDelta = vi.fn();
    const client = createClient();
    const response = await client.chatStream(
      {
        model: "kimi",
        messages: [{ role: "user", content: "hi" }],
      },
      onDelta,
    );

    expect(onDelta).toHaveBeenCalledTimes(2);
    expect(onDelta).toHaveBeenNthCalledWith(1, "intermediate ", "answer");
    expect(onDelta).toHaveBeenNthCalledWith(2, "chunk", "answer");
    expect(response.outputText).toBe("Final answer");
    expect(response.thinkingText).toBe("Final thinking");
    expect(response.conversationId).toBe("conv-end");
  });

  it("throws on docs-style stream error events", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createSseResponse([
        `event: Error\ndata: ${JSON.stringify({
          error: "stream exploded",
        })}\n\n`,
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createClient();
    await expect(
      client.chatStream(
        {
          model: "kimi",
          messages: [{ role: "user", content: "hi" }],
        },
        () => {
          // No-op for this test.
        },
      ),
    ).rejects.toThrow("stream exploded");
  });

  it("uses final structured stream output when available", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createSseResponse(
        [
          `data: ${JSON.stringify({
            event_kind: "part_delta",
            delta: { content_delta: "intermediate " },
          })}\n`,
          `data: ${JSON.stringify({
            event_kind: "final_result",
            output: {
              answer: "Final answer",
              thinking: "Final thinking",
            },
          })}\n`,
          "data: [DONE]\n",
        ],
        { "x-conversation-id": "conv-123" },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createClient();
    const response = await client.chatStream(
      {
        model: "kimi",
        messages: [{ role: "user", content: "hi" }],
      },
      () => {
        // No-op for this test.
      },
    );

    expect(response.outputText).toBe("Final answer");
    expect(response.thinkingText).toBe("Final thinking");
    expect(response.conversationId).toBe("conv-123");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestBody = parseJsonRequestBody(init);
    expect(requestBody.output_format).toMatchObject({
      type: "object",
      required: ["answer", "thinking"],
    });
  });

  it("preserves whitespace in stream delta fallback output", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createSseResponse([
        `data: ${JSON.stringify({
          event_kind: "part_delta",
          delta: { content_delta: "Hello" },
        })}\n`,
        `data: ${JSON.stringify({
          event_kind: "part_delta",
          delta: { content_delta: " world" },
        })}\n`,
        `data: ${JSON.stringify({
          event_kind: "part_delta",
          delta: { content_delta: "\n- item" },
        })}\n`,
        "data: [DONE]\n",
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createClient();
    const response = await client.chatStream(
      {
        model: "kimi",
        messages: [{ role: "user", content: "hi" }],
      },
      () => {
        // No-op for this test.
      },
    );

    expect(response.outputText).toBe("Hello world\n- item");
    expect(response.thinkingText).toBeUndefined();
  });
});
