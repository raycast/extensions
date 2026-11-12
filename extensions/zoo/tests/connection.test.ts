import assert from "node:assert/strict";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { test } from "node:test";
import { checkConnection } from "../src/ai/check-connection";
import { describeError, providers, resolveSettings } from "../src/ai/config";

for (const provider of ["openai", "gemini", "anthropic", "deepseek"] as const) {
  test(`${provider} connection checks query models without sending any prompt or input.`, async () => {
    let requests = 0;
    const server = createServer(async (request, response) => {
      requests += 1;
      assert.equal(request.method, "GET");
      assert.equal(request.headers.authorization, "Bearer zoo-test-placeholder");
      assert.equal(request.url, provider === "anthropic" ? "/v1/models" : "/models");
      let body = "";
      for await (const chunk of request) body += chunk;
      assert.equal(body, "");
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          data: [{ id: provider === "gemini" ? `models/${providers[provider].model}` : providers[provider].model }],
          has_more: false,
        }),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const settings = {
        ...resolveSettings({ provider }),
        baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      };
      assert.equal(await checkConnection(settings, "  zoo-test-placeholder\n", new AbortController().signal), true);
      assert.equal(
        await checkConnection(
          { ...settings, model: "unlisted-model" },
          "zoo-test-placeholder",
          new AbortController().signal,
        ),
        false,
      );
      assert.equal(requests, 2);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
}

test("A Google HTTP 400 key failure survives SDK parsing as a safe, specific diagnosis.", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        error: {
          code: 400,
          status: "INVALID_ARGUMENT",
          message: "API key not valid.",
          details: [{ reason: "API_KEY_INVALID" }],
        },
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const settings = {
      ...resolveSettings({ provider: "gemini" }),
      baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    };
    await assert.rejects(checkConnection(settings, "zoo-test-placeholder", new AbortController().signal), (error) => {
      const message = describeError(error);
      assert.match(message, /HTTP 400/);
      assert.match(message, /API_KEY_INVALID/);
      assert.ok(!message.includes("zoo-test-placeholder"));
      return true;
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

for (const provider of ["gemini", "anthropic"] as const) {
  test(`${provider} connection checks can be cancelled while the model response is incomplete.`, async () => {
    const controller = new AbortController();
    const server = createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.write('{"data":[');
      controller.abort();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const settings = {
        ...resolveSettings({ provider }),
        baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      };
      await assert.rejects(checkConnection(settings, "zoo-test-placeholder", controller.signal), /abort/i);
      assert.equal(controller.signal.aborted, true);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
}
