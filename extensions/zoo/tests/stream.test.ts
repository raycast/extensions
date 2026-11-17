import assert from "node:assert/strict";
import { createServer, ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { test } from "node:test";
import { providers, Provider, resolveSettings } from "../src/ai/config";
import { AIUpdate, streamAnswer } from "../src/ai/stream";

const prompt = "Translate the user's text into German.";
const input = "Good morning. 早上好。";

function sendEvents(response: ServerResponse, events: object[], done = true) {
  response.writeHead(200, { "Content-Type": "text/event-stream" });
  for (const event of events) {
    const type = (event as { type?: string }).type;
    response.write(`${type ? `event: ${type}\n` : ""}data: ${JSON.stringify(event)}\n\n`);
  }
  if (done) response.write("data: [DONE]\n\n");
  response.end();
}

function chatEvents(finishReason = "stop") {
  return [
    { choices: [] },
    { choices: [{ delta: { role: "assistant" }, finish_reason: null }] },
    { choices: [{ delta: { content: "Guten " }, finish_reason: null }] },
    { choices: [{ delta: { content: "Morgen. 早上好。" }, finish_reason: null }] },
    { choices: [{ delta: {}, finish_reason: finishReason }] },
    { choices: [], usage: { prompt_tokens: 50, completion_tokens: 10 } },
  ];
}

async function withService(
  handler: (body: Record<string, unknown>, response: ServerResponse, path: string) => void,
  run: (baseURL: string) => Promise<void>,
) {
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    handler(JSON.parse(body), response, request.url || "");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function ask(
  provider: Provider,
  baseURL: string,
  onUpdate: (update: AIUpdate) => void,
  signal = new AbortController().signal,
) {
  const settings =
    provider === "custom"
      ? resolveSettings({ provider, baseurl: baseURL, custom_model: "example-model" })
      : { ...resolveSettings({ provider }), baseURL };
  await streamAnswer({ settings, apiKey: "zoo-test-placeholder", prompt, input, signal, onUpdate });
}

for (const provider of ["openai", "gemini", "deepseek", "custom"] as const) {
  test(`${providers[provider].name} sends the Gist as system instructions and safely reads text and usage chunks.`, async () => {
    await withService(
      (body, response, path) => {
        assert.equal(path, "/chat/completions");
        assert.deepEqual(body.messages, [
          { role: "system", content: prompt },
          { role: "user", content: input },
        ]);
        assert.equal(body.model, provider === "custom" ? "example-model" : providers[provider].model);
        assert.equal(body.stream, true);
        assert.equal(body.temperature, undefined);
        assert.equal(body.max_tokens, undefined);
        assert.deepEqual(body.stream_options, provider === "custom" ? undefined : { include_usage: true });
        sendEvents(response, chatEvents());
      },
      async (baseURL) => {
        const updates: AIUpdate[] = [];
        await ask(provider, baseURL, (update) => updates.push(update));
        assert.equal(updates.filter((update) => update.text).at(-1)?.text, "Guten Morgen. 早上好。");
        assert.deepEqual(updates.at(-1)?.usage, { inputTokens: 50, outputTokens: 10 });
      },
    );
  });
}

test("Claude uses the native Messages API and ignores thinking deltas while counting cached input tokens.", async () => {
  await withService(
    (body, response, path) => {
      assert.equal(path, "/v1/messages");
      assert.equal(body.system, prompt);
      assert.deepEqual(body.messages, [{ role: "user", content: input }]);
      assert.equal(body.max_tokens, 16384);
      sendEvents(
        response,
        [
          {
            type: "message_start",
            message: { usage: { input_tokens: 20, cache_read_input_tokens: 30, cache_creation_input_tokens: 10 } },
          },
          { type: "content_block_delta", delta: { type: "thinking_delta", thinking: "This text is not the answer." } },
          { type: "content_block_start", content_block: { type: "text", text: "Guten " } },
          { type: "content_block_delta", delta: { type: "text_delta", text: "Morgen." } },
          { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 10 } },
          { type: "message_stop" },
        ],
        false,
      );
    },
    async (baseURL) => {
      const updates: AIUpdate[] = [];
      await ask("anthropic", baseURL, (update) => updates.push(update));
      assert.equal(updates.filter((update) => update.text).at(-1)?.text, "Guten Morgen.");
      assert.deepEqual(updates.at(-1)?.usage, { inputTokens: 60, outputTokens: 10 });
    },
  );
});

test("Compatible servers can omit usage without producing fabricated token counts.", async () => {
  await withService(
    (_body, response) => sendEvents(response, chatEvents().slice(0, -1)),
    async (baseURL) => {
      const updates: AIUpdate[] = [];
      await ask("custom", baseURL, (update) => updates.push(update));
      assert.ok(updates.every((update) => update.usage === undefined));
    },
  );
});

test("A response stopped at the output limit retains its text and reports truncation.", async () => {
  await withService(
    (_body, response) => sendEvents(response, chatEvents("length")),
    async (baseURL) => {
      const updates: AIUpdate[] = [];
      await assert.rejects(
        ask("openai", baseURL, (update) => updates.push(update)),
        /output limit/,
      );
      assert.ok(updates.some((update) => update.text));
    },
  );
});

test("A response with no answer text produces an actionable error.", async () => {
  await withService(
    (_body, response) => sendEvents(response, [{ choices: [], usage: { prompt_tokens: 50, completion_tokens: 10 } }]),
    async (baseURL) => {
      await assert.rejects(
        ask("openai", baseURL, () => undefined),
        /returned no text/,
      );
    },
  );
});

test("An interrupted stream keeps its partial text and reports that the response did not finish.", async () => {
  await withService(
    (_body, response) => sendEvents(response, chatEvents().slice(0, 4)),
    async (baseURL) => {
      const updates: AIUpdate[] = [];
      await assert.rejects(
        ask("openai", baseURL, (update) => updates.push(update)),
        /before completion/,
      );
      assert.equal(updates.at(-1)?.text, "Guten Morgen. 早上好。");
    },
  );
});

test("A missing API key fails before contacting the provider.", async () => {
  await assert.rejects(
    streamAnswer({
      settings: resolveSettings({}),
      apiKey: "",
      prompt,
      input,
      signal: new AbortController().signal,
      onUpdate: () => undefined,
    }),
    /Set the API key/,
  );
});

test("Provider authentication failures are surfaced without automatic retries.", async () => {
  let requests = 0;
  await withService(
    (_body, response) => {
      requests += 1;
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: { message: "This is a simulated authentication failure." } }));
    },
    async (baseURL) => {
      await assert.rejects(
        ask("openai", baseURL, () => undefined),
        (error: { status?: number }) => error.status === 401,
      );
    },
  );
  assert.equal(requests, 1);
});

test("Cancellation aborts an active stream instead of continuing generation.", async () => {
  await withService(
    (_body, response) => {
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "First chunk." } }] })}\n\n`);
    },
    async (baseURL) => {
      const controller = new AbortController();
      let updates = 0;
      await ask(
        "openai",
        baseURL,
        () => {
          updates += 1;
          controller.abort();
        },
        controller.signal,
      );
      assert.equal(controller.signal.aborted, true);
      assert.equal(updates, 1);
    },
  );
});

test("Empty prompts and inputs fail before contacting the provider.", async () => {
  for (const values of [
    { prompt: " ", input },
    { prompt, input: " " },
  ]) {
    await assert.rejects(
      streamAnswer({
        settings: resolveSettings({}),
        apiKey: "zoo-test-placeholder",
        signal: new AbortController().signal,
        onUpdate: () => undefined,
        ...values,
      }),
      /empty|Select/,
    );
  }
});
