import assert from "node:assert/strict";
import { test } from "node:test";
import { describeError, estimateCost, providers, resolveSettings } from "../src/ai/config";

test("Each named provider uses its official endpoint and default model.", () => {
  for (const provider of ["openai", "gemini", "anthropic", "deepseek"] as const) {
    assert.deepEqual(resolveSettings({ provider, model: "default", baseurl: "https://old.example/v1" }), {
      provider,
      baseURL: providers[provider].baseURL,
      model: providers[provider].model,
    });
  }
});

test("Automatic mode routes Gemini, Claude, and DeepSeek models away from the legacy OpenAI default endpoint.", () => {
  for (const provider of ["gemini", "anthropic", "deepseek"] as const) {
    const settings = resolveSettings({ model: providers[provider].model, baseurl: "https://api.openai.com/v1/" });
    assert.equal(settings.provider, provider);
    assert.equal(settings.baseURL, providers[provider].baseURL);
  }
});

test("Automatic mode preserves a saved compatible endpoint and custom model ID.", () => {
  assert.deepEqual(
    resolveSettings({
      baseurl: " https://openrouter.ai/api/v1/ ",
      model: "gpt-4o",
      custom_model: " anthropic/claude-sonnet-5-5 ",
    }),
    { provider: "custom", baseURL: "https://openrouter.ai/api/v1", model: "anthropic/claude-sonnet-5-5" },
  );
});

test("Known legacy endpoints select their provider and normalize the API path.", () => {
  assert.equal(
    resolveSettings({ baseurl: "https://generativelanguage.googleapis.com/v1beta/" }).baseURL,
    providers.gemini.baseURL,
  );
  assert.equal(resolveSettings({ baseurl: "https://api.anthropic.com/v1/" }).baseURL, providers.anthropic.baseURL);
  assert.equal(resolveSettings({ baseurl: "https://api.deepseek.com/v1" }).provider, "deepseek");
});

test("A mismatched provider and model fail before any request is sent.", () => {
  assert.throws(() => resolveSettings({ provider: "anthropic", model: "gemini-3.8-flash" }), /different service/);
});

test("Custom endpoints require a model and allow local compatible servers.", () => {
  assert.throws(() => resolveSettings({ provider: "custom", baseurl: "https://example.com/v1" }), /custom model ID/);
  assert.throws(() => resolveSettings({ provider: "custom", custom_model: "model" }), /API endpoint/);
  assert.equal(
    resolveSettings({ provider: "custom", baseurl: "http://localhost:11434/v1", custom_model: "local-model" }).provider,
    "custom",
  );
});

test("Invalid URLs and URLs containing credentials or query parameters are rejected.", () => {
  for (const baseurl of [
    "invalid",
    "file:///tmp/endpoint",
    "https://user:placeholder@example.com",
    "https://example.com?key=placeholder",
    "https://example.com/#fragment",
  ]) {
    assert.throws(() => resolveSettings({ provider: "custom", baseurl, custom_model: "model" }));
  }
});

test("Costs use reported token usage and explicit prices in USD per million tokens.", () => {
  const usage = { inputTokens: 2000, outputTokens: 1000 };
  assert.equal(estimateCost(usage, "2", "10"), 0.014);
  assert.equal(estimateCost(usage, "0", "0"), 0);
  assert.equal(estimateCost(undefined, "2", "10"), undefined);
  for (const price of [undefined, "", " ", "NaN", "Infinity", "-1"]) {
    assert.equal(estimateCost(usage, price, "10"), undefined);
    assert.equal(estimateCost(usage, "2", price), undefined);
  }
});

test("Provider errors produce actionable messages without exposing the raw response.", () => {
  for (const status of [400, 401, 403, 404, 422, 429, 500, 529]) {
    const message = describeError({ status, message: "A simulated provider response contains private request data." });
    assert.ok(!message.includes("private request data"));
    assert.ok(message.length > 10);
  }
});

test("Google's HTTP 400 invalid-key response identifies the key instead of blaming the model or input.", () => {
  const message = describeError({
    status: 400,
    error: {
      status: "INVALID_ARGUMENT",
      message: "API key not valid. Please pass a valid API key.",
      details: [{ reason: "API_KEY_INVALID" }],
    },
  });
  assert.match(message, /HTTP 400/);
  assert.match(message, /API_KEY_INVALID/);
  assert.match(message, /API key/);
  assert.doesNotMatch(message, /input length/);
});

test("Google's serialized array errors retain their safe diagnostic reason.", () => {
  const message = describeError({ status: 400, message: '400 [{"error":{"details":[{"reason":"API_KEY_INVALID"}]}}]' });
  assert.match(message, /API_KEY_INVALID/);
});

test("Region and billing errors produce specific next steps.", () => {
  assert.match(
    describeError({ status: 400, error: { message: "User location is not supported for the API use." } }),
    /current region/,
  );
  assert.match(
    describeError({ status: 400, error: { message: "Free tier is not available. Enable billing." } }),
    /billing or API credits/,
  );
});

test("Restricted or disabled Google API access produces specific next steps.", () => {
  for (const reason of [
    "API_KEY_SERVICE_BLOCKED",
    "API_KEY_HTTP_REFERRER_BLOCKED",
    "API_KEY_IP_ADDRESS_BLOCKED",
    "SERVICE_DISABLED",
    "BILLING_DISABLED",
  ]) {
    assert.match(describeError({ status: 403, error: { details: [{ reason }] } }), new RegExp(reason));
  }
});

test("Diagnostics never echo arbitrary provider messages or request data.", () => {
  const privateText = "This is simulated private text that must stay hidden.";
  for (const message of [
    privateText,
    `${privateText} API_KEY_INVALID`,
    `${privateText} User location is not supported`,
    `${privateText} billing`,
    `${privateText} include_usage`,
  ]) {
    const description = describeError({ status: 400, message, error: { message, details: [{ reason: privateText }] } });
    assert.ok(!description.includes(privateText));
    assert.ok(!description.includes("simulated"));
  }
});
