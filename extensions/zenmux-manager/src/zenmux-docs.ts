export type ZenMuxDocEntry = {
  title: string;
  category: string;
  keywords: string[];
  summary: string;
  url: string;
  /**
   * Verbatim answer-ready facts (env vars, endpoints, key formats, field names).
   * Must be reproduced exactly in answers, not paraphrased.
   */
  facts?: string[];
  /**
   * Short ordered setup steps. Use only when a question typically needs procedure.
   */
  steps?: string[];
  /**
   * A single copy-paste snippet (shell, TOML, JSON, etc.). Already includes its
   * own fence info string in `language` so the tool can render it predictably.
   */
  snippet?: {
    language: string;
    code: string;
  };
  /**
   * Common mistakes the model must avoid in its answer.
   */
  warnings?: string[];
};

export const ZENMUX_DOCS: ZenMuxDocEntry[] = [
  {
    title: "ZenMux Introduction",
    category: "Overview",
    keywords: ["what is zenmux", "overview", "architecture", "llm aggregation", "insurance", "providers"],
    summary:
      "ZenMux is an LLM API aggregation platform with unified access to models from providers such as OpenAI, Anthropic, Google, and more. It emphasizes dual-protocol support, intelligent routing, observability, and insurance-backed quality guarantees.",
    url: "https://docs.zenmux.ai/about/intro",
  },
  {
    title: "Quick Start",
    category: "Getting Started",
    keywords: [
      "quickstart",
      "get started",
      "api key",
      "base url",
      "openai",
      "anthropic",
      "vertex ai",
      "responses",
      "first request",
      "protocol",
    ],
    summary:
      "ZenMux supports four wire protocols. Pick one, point its base URL at ZenMux, and pass a ZenMux API key. There are two model API key formats (subscription `sk-ss-v1-`, PAYG `sk-ai-v1-`) plus a separate Platform API Key for Platform APIs.",
    url: "https://docs.zenmux.ai/guide/quickstart",
    facts: [
      "OpenAI Chat Completions base URL: `https://zenmux.ai/api/v1` (OpenAI SDK).",
      "OpenAI Responses base URL: `https://zenmux.ai/api/v1` (OpenAI SDK, `client.responses.create`).",
      "Anthropic Messages base URL: `https://zenmux.ai/api/anthropic` (Anthropic SDK).",
      "Google Gemini / Vertex AI base URL: `https://zenmux.ai/api/vertex-ai` (Google GenAI SDK with `vertexai=True`).",
      "Subscription API key format: `sk-ss-v1-...` (Builder plans, personal use).",
      "Pay As You Go API key format: `sk-ai-v1-...` (production, no rate limits).",
      "Platform API key is separate; create it at https://zenmux.ai/platform/management and use it only for `/api/v1/management/*` endpoints.",
      "Auth header for OpenAI/Vertex/Anthropic protocols: `Authorization: Bearer $ZENMUX_API_KEY` (Anthropic SDK uses `x-api-key` automatically).",
    ],
    snippet: {
      language: "bash",
      code: 'curl https://zenmux.ai/api/v1/chat/completions \\\n  -H "Authorization: Bearer $ZENMUX_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"model":"openai/gpt-5.2","messages":[{"role":"user","content":"hi"}]}\'',
    },
    warnings: [
      "Do not call `https://zenmux.ai/v1` or `https://api.zenmux.ai/v1`; those are wrong. Use `https://zenmux.ai/api/v1`.",
      "Do not use a Platform API key for chat or model traffic; it only works on `/api/v1/management/*`.",
    ],
  },
  {
    title: "Pay As You Go",
    category: "Billing",
    keywords: ["payg", "pay as you go", "balance", "credits", "top up", "bonus", "production", "billing", "sk-ai-v1"],
    summary:
      "Pay As You Go is the production-oriented plan with prepaid USD credits, usage-based billing, no rate limits, and 20% bonus credits on top-ups. PAYG API keys use the `sk-ai-v1-...` format.",
    url: "https://docs.zenmux.ai/guide/pay-as-you-go",
    facts: [
      "PAYG API key format: `sk-ai-v1-...`.",
      "Console fields: total balance, top-up credits, bonus credits, currency.",
      "Top-ups include a 20% bonus credit automatically.",
      "Manage at https://zenmux.ai/platform/pay-as-you-go.",
    ],
    warnings: [
      "Do not confuse PAYG balance with subscription quota; PAYG charges per request from prepaid credits while subscription consumes Flow quota windows.",
    ],
  },
  {
    title: "Subscription Plans",
    category: "Billing",
    keywords: [
      "subscription",
      "builder plan",
      "flows",
      "quota",
      "5 hour",
      "5-hour",
      "7 day",
      "7-day rolling",
      "monthly",
      "tier",
      "sk-ss-v1",
    ],
    summary:
      "Builder Plan is a fixed monthly subscription for personal development. Quota is measured in Flows across a 5-hour rolling window, a 7-day rolling window, and a monthly cap. Subscription API keys use the `sk-ss-v1-...` format.",
    url: "https://docs.zenmux.ai/guide/subscription",
    facts: [
      "Subscription API key format: `sk-ss-v1-...`.",
      "Plan tiers: `free`, `pro` ($20/mo), `max` ($100/mo), `ultra` ($200/mo).",
      "Quota windows: 5-hour rolling (`quota_5_hour`), 7-day rolling (`quota_7_day`), monthly cap (`quota_monthly`, cap-only).",
      "Monthly quota exposes only `max_flows` and `max_value_usd`; there is no real-time monthly usage field.",
      "Subscription keys are not allowed for production use; violations may restrict the account.",
      "Manage at https://zenmux.ai/platform/subscription.",
    ],
    warnings: [
      'Do not call the 7-day window "weekly"; it is a rolling 7-day window, not a calendar week.',
      "Do not present a monthly usage percentage; only the cap is exposed.",
    ],
  },
  {
    title: "Request Logs",
    category: "Observability",
    keywords: ["logs", "request logs", "tokens", "cost", "latency", "throughput", "request details", "debug"],
    summary:
      "The ZenMux Logs console shows detailed API call records including timestamp, model, input/output tokens, cost, latency, throughput, finish reason, and request details.",
    url: "https://docs.zenmux.ai/guide/observability/logs",
  },
  {
    title: "Usage Analytics",
    category: "Observability",
    keywords: ["usage", "analytics", "statistics", "tokens", "cost trend", "timeseries", "leaderboard", "market share"],
    summary:
      "ZenMux usage analytics helps monitor token usage, cost trends, model leaderboards, provider market share, and other platform statistics.",
    url: "https://docs.zenmux.ai/guide/observability/usage",
  },
  {
    title: "Provider Routing",
    category: "Advanced",
    keywords: [
      "provider routing",
      "provider",
      "routing",
      "provider slug",
      "model provider",
      "latency",
      "price",
      "throughput",
      "primary_factor",
    ],
    summary:
      "Pin a request to a specific upstream provider with the `model_slug:provider_slug` syntax, or use the `provider.routing` field for ranked or ordered selection. Default behavior is intelligent latency-first routing with millisecond failover.",
    url: "https://docs.zenmux.ai/guide/advanced/provider-routing",
    facts: [
      "Quick syntax: append `:provider_slug` to the model name, e.g. `anthropic/claude-3.7-sonnet:amazon-bedrock`.",
      "Advanced field: `provider.routing.type` is `priority` (with `primary_factor: latency | price | throughput`) or `order` (with explicit `providers: [...]`).",
      "Provider slugs are listed on each model's detail page on https://zenmux.ai/models.",
      "When `type: order` is used, ZenMux tries each provider in turn and stops on first success; if all error, it returns the last error.",
    ],
    snippet: {
      language: "json",
      code: '{\n  "model": "anthropic/claude-sonnet-4",\n  "provider": {\n    "routing": {\n      "type": "order",\n      "providers": [\n        "anthropic/anthropic_endpoint",\n        "google-vertex/VertexAIAnthropic",\n        "amazon-bedrock/BedrockAnthropic"\n      ]\n    }\n  },\n  "messages": [{"role": "user", "content": "Hello"}]\n}',
    },
  },
  {
    title: "Model Routing",
    category: "Advanced",
    keywords: ["model routing", "routing", "models", "fallback route", "multiple models", "route"],
    summary:
      "Model routing controls how ZenMux chooses among models for a request, including multi-model routing and fallback-style behavior.",
    url: "https://docs.zenmux.ai/guide/advanced/model-routing",
  },
  {
    title: "Fallback Mechanism",
    category: "Advanced",
    keywords: ["fallback", "failover", "backup model", "provider fallback", "model failure", "route fallback"],
    summary:
      "Set a fallback model globally in the console or per request via `provider.fallback`. ZenMux retries with the fallback when the primary model returns 5xx, 401/403, 404, rate-limit, or timeout errors. Per-request configuration overrides the global setting.",
    url: "https://docs.zenmux.ai/guide/advanced/fallback",
    facts: [
      'Per-request field: `provider.fallback: "<model_slug>"`.',
      "Global setting: https://zenmux.ai/settings/strategy → Default Fallback Model.",
      "Trigger conditions: 5xx, timeouts, 401/403, 429 rate limits, 404 model not found, or all routing candidates failing.",
      "Only one level of fallback is applied; if the fallback model also fails, the error is returned.",
      "The actual model used is reflected in the response `model` field, so the caller can detect when fallback fired.",
    ],
    snippet: {
      language: "json",
      code: '{\n  "model": "anthropic/claude-sonnet-4",\n  "provider": {\n    "fallback": "google/gemini-2.5-flash-lite"\n  },\n  "messages": [{"role": "user", "content": "Hello"}]\n}',
    },
  },
  {
    title: "Streaming",
    category: "Advanced",
    keywords: ["stream", "streaming", "sse", "server sent events", "tokens"],
    summary:
      "ZenMux supports streaming responses through compatible API protocols so applications can receive tokens incrementally.",
    url: "https://docs.zenmux.ai/guide/advanced/streaming",
  },
  {
    title: "Tool Calls",
    category: "Advanced",
    keywords: ["tools", "tool calling", "function calling", "tool_use", "functions"],
    summary:
      "ZenMux supports tool/function calling across compatible models and protocols, with transformations for providers that use different tool formats.",
    url: "https://docs.zenmux.ai/guide/advanced/tool-calls",
  },
  {
    title: "Structured Output",
    category: "Advanced",
    keywords: ["structured output", "json", "json schema", "response format", "json mode"],
    summary:
      "Structured output helps force model responses into JSON or schema-like formats for application integration.",
    url: "https://docs.zenmux.ai/guide/advanced/structured-output",
  },
  {
    title: "Prompt Cache",
    category: "Advanced",
    keywords: ["prompt cache", "cache", "cached tokens", "input_cache_read", "input_cache_write"],
    summary:
      "Prompt caching can reduce latency and cost by reusing repeated prompt context. Cache token details can be inspected in ZenMux logs.",
    url: "https://docs.zenmux.ai/guide/advanced/prompt-cache",
  },
  {
    title: "Error Codes",
    category: "Advanced",
    keywords: [
      "error",
      "errors",
      "error code",
      "troubleshooting",
      "400",
      "401",
      "403",
      "404",
      "429",
      "rate limit",
      "invalid params",
      "auth",
    ],
    summary:
      "Common ZenMux API errors map to standard HTTP status codes. 401/403 means auth or permission, 404 means model not found, 429 means rate limited, 5xx means upstream provider issue.",
    url: "https://docs.zenmux.ai/guide/advanced/error-codes",
    facts: [
      "401 / 403: invalid or unauthorized API key. Confirm key prefix (`sk-ss-v1-`, `sk-ai-v1-`, or Platform key) matches the endpoint.",
      "400 `invalid_params`: wrong request body shape (e.g. Responses-style body sent to Chat Completions).",
      "404: model slug is misspelled or temporarily offline; check https://zenmux.ai/models.",
      "429: rate limit hit on the upstream provider; consider provider routing or fallback.",
      "5xx: upstream provider error; ZenMux can fall back automatically if `provider.fallback` is configured.",
    ],
  },
  {
    title: "OpenAI Chat Completions API",
    category: "API Reference",
    keywords: ["openai", "chat completions", "api/v1", "messages", "base_url", "sdk"],
    summary:
      'OpenAI-compatible Chat Completions endpoint. Use the OpenAI SDK with `base_url="https://zenmux.ai/api/v1"` and any ZenMux model slug.',
    url: "https://docs.zenmux.ai/api/openai/create-chat-completion",
    facts: [
      "Endpoint: `POST https://zenmux.ai/api/v1/chat/completions`.",
      "Auth header: `Authorization: Bearer $ZENMUX_API_KEY`.",
      'OpenAI SDK config: `base_url="https://zenmux.ai/api/v1"`, `api_key="<ZENMUX_API_KEY>"`.',
      "The `model` field takes a ZenMux slug, e.g. `openai/gpt-5.2`, `anthropic/claude-sonnet-4.5`, `google/gemini-2.5-pro`.",
    ],
    snippet: {
      language: "python",
      code: 'from openai import OpenAI\n\nclient = OpenAI(\n    base_url="https://zenmux.ai/api/v1",\n    api_key="<your ZENMUX_API_KEY>",\n)\n\nresp = client.chat.completions.create(\n    model="openai/gpt-5.2",\n    messages=[{"role": "user", "content": "Hello"}],\n)\nprint(resp.choices[0].message.content)',
    },
  },
  {
    title: "OpenAI Responses API",
    category: "API Reference",
    keywords: ["responses api", "openai responses", "input", "response", "api/v1"],
    summary:
      "ZenMux supports the OpenAI Responses protocol on the same base URL as Chat Completions. Used by Codex CLI and modern OpenAI SDKs.",
    url: "https://docs.zenmux.ai/api/openai/openai-responses",
    facts: [
      "Endpoint: `POST https://zenmux.ai/api/v1/responses`.",
      "Auth header: `Authorization: Bearer $ZENMUX_API_KEY`.",
      "Use `client.responses.create(model=..., input=...)` from the OpenAI SDK.",
      "Filter the model list to Responses-compatible models at https://zenmux.ai/models?sort=newest&supported_protocol=responses.",
    ],
  },
  {
    title: "Anthropic Messages API",
    category: "API Reference",
    keywords: ["anthropic", "messages", "claude", "api/anthropic", "anthropic sdk", "x-api-key"],
    summary:
      "Anthropic-compatible Messages endpoint at `https://zenmux.ai/api/anthropic`. Use the official Anthropic SDK with the ZenMux base URL.",
    url: "https://docs.zenmux.ai/api/anthropic/create-messages",
    facts: [
      "Endpoint: `POST https://zenmux.ai/api/anthropic/v1/messages`.",
      "Auth header (raw HTTP): `x-api-key: $ZENMUX_API_KEY` and `anthropic-version: 2023-06-01`.",
      'Anthropic SDK config: `base_url="https://zenmux.ai/api/anthropic"`, `api_key="<ZENMUX_API_KEY>"`.',
      "Filter Anthropic-compatible models at https://zenmux.ai/models with the `Anthropic API Compatible` filter.",
    ],
  },
  {
    title: "Vertex AI Generate Content API",
    category: "API Reference",
    keywords: ["vertex ai", "gemini", "generate content", "google", "api/vertex-ai", "googlegenai"],
    summary:
      "Google Gemini protocol via Vertex AI compatibility at `https://zenmux.ai/api/vertex-ai`. Use the Google GenAI SDK with `vertexai=True`.",
    url: "https://docs.zenmux.ai/api/vertexai/generate-content",
    facts: [
      "Base URL: `https://zenmux.ai/api/vertex-ai` (with `apiVersion: 'v1'`).",
      "Google GenAI SDK config: `vertexai=True`, `api_key=\"<ZENMUX_API_KEY>\"`, `http_options=HttpOptions(api_version='v1', base_url='https://zenmux.ai/api/vertex-ai')`.",
      "Use a Gemini-family model slug, e.g. `google/gemini-3.1-pro-preview`.",
    ],
  },
  {
    title: "Platform API: Subscription Detail",
    category: "Platform API",
    keywords: [
      "platform api",
      "subscription detail",
      "quota",
      "5 hour",
      "5-hour",
      "7 day",
      "7-day",
      "monthly cap",
      "flow rate",
      "account status",
    ],
    summary:
      "Returns plan tier, account status, Flow rate (base + effective), and the three quota windows. Requires the Platform API Key. Monthly quota exposes only the cap, not real-time usage.",
    url: "https://docs.zenmux.ai/api/platform/subscription-detail",
    facts: [
      "Endpoint: `GET https://zenmux.ai/api/v1/management/subscription/detail`.",
      "Auth header: `Authorization: Bearer $ZENMUX_PLATFORM_API_KEY` (Platform API Key only).",
      "`data.plan.tier` enum: `free` | `pro` | `max` | `ultra`.",
      "`data.account_status` enum: `healthy` | `monitored` | `abusive` | `suspended` | `banned`.",
      "Two Flow rate fields: `data.base_usd_per_flow` (platform base) and `data.effective_usd_per_flow` (account-specific, may be higher if anomalies are detected).",
      "Quota windows: `data.quota_5_hour`, `data.quota_7_day` (each with `max_flows`, `used_flows`, `remaining_flows`, `usage_percentage`, `resets_at`, `used_value_usd`, `max_value_usd`).",
      "`data.quota_monthly` is cap-only: `max_flows` and `max_value_usd` only.",
    ],
    warnings: [
      "Do not use a regular subscription or PAYG API key here; account endpoints require a Platform API Key.",
      "Do not invent a monthly usage percentage; the API does not return monthly usage values.",
    ],
  },
  {
    title: "Platform API: PAYG Balance",
    category: "Platform API",
    keywords: ["platform api", "payg balance", "credits", "top up", "bonus credits", "wallet"],
    summary: "Returns the wallet balance for the Pay As You Go account. Requires the Platform API Key.",
    url: "https://docs.zenmux.ai/api/platform/payg-balance",
    facts: [
      "Endpoint: `GET https://zenmux.ai/api/v1/management/payg/balance`.",
      "Auth header: `Authorization: Bearer $ZENMUX_PLATFORM_API_KEY`.",
      "Response fields: `data.total_credits`, `data.top_up_credits`, `data.bonus_credits`, `data.currency`.",
    ],
  },
  {
    title: "Platform API: Generation Detail",
    category: "Platform API",
    keywords: ["generation", "generation id", "cost", "tokens", "latency", "request detail"],
    summary:
      "Look up token usage, latency, cost, finish reason, and provider for a single generation by ID. Requires the Platform API Key. Billing fields appear after a 3-5 minute delay.",
    url: "https://docs.zenmux.ai/api/platform/get-generation",
    facts: [
      "Endpoint: `GET https://zenmux.ai/api/v1/management/generation?id=<generation_id>`.",
      "Auth header: `Authorization: Bearer $ZENMUX_PLATFORM_API_KEY`.",
      "Each chat/completion response includes a `generation_id`; pass that as the `id` query parameter.",
      "Billing fields (`usage`, `ratingResponses`) have a 3-5 minute delay after the original request.",
      "Subscription-plan keys (`sk-ss-v1-...`) get metering data only; cost/billing fields are not populated for them.",
    ],
    warnings: ["The legacy `/api/v1/generation` URL is deprecated; use `/api/v1/management/generation`."],
  },
  {
    title: "Cursor Integration",
    category: "Best Practices",
    keywords: [
      "cursor",
      "cursor pro",
      "custom model",
      "openai api key",
      "override openai base url",
      "model not found",
      "parameter messages is required",
    ],
    summary:
      "Cursor uses ZenMux through its OpenAI-compatible Custom Models settings. Custom Models require a Cursor Pro subscription. Use a PAYG ZenMux API key (`sk-ai-v1-...`) and override the OpenAI base URL to `https://zenmux.ai/api/v1`.",
    url: "https://docs.zenmux.ai/best-practices/cursor",
    facts: [
      "Custom Models in Cursor require an active Cursor Pro subscription.",
      "Recommended ZenMux key: PAYG `sk-ai-v1-...` from https://zenmux.ai/platform/pay-as-you-go.",
      "Override OpenAI Base URL must be exactly `https://zenmux.ai/api/v1` (no trailing slash, no `api.zenmux.ai`).",
      "Model slugs must come from https://zenmux.ai/models (e.g. `anthropic/claude-3.7-sonnet`, `openai/gpt-5.2`).",
      "Known issue: GPT-series models can return `400 Parameter messages is required` because Cursor sends Responses-style bodies to the Chat Completions endpoint; no client-side workaround.",
      "Known issue: Claude-series models can return `400 unsupported tool definition` because Cursor passes tool definitions Chat Completions does not accept; no client-side workaround.",
    ],
    steps: [
      "Open Cursor Settings → Models.",
      "Toggle on `OpenAI API Key` and paste your ZenMux PAYG key.",
      "Toggle on `Override OpenAI Base URL` and enter `https://zenmux.ai/api/v1`.",
      "Click `+ Add Custom Model` and add the ZenMux model slugs you want.",
      "Make sure the toggle next to each new model is green.",
      "Open the chat panel, pick the new model, and send a test message.",
    ],
    warnings: [
      "Do not use the Anthropic endpoint here; Cursor's Custom Models flow is OpenAI-compatible only.",
      "Do not use a Platform API key; that key is account-only.",
    ],
  },
  {
    title: "Claude Code Integration",
    category: "Best Practices",
    keywords: [
      "claude code",
      "anthropic base url",
      "anthropic auth token",
      "claude",
      "subscription",
      "subscription api key",
      "payg",
      "payg api key",
      "model alias",
      "1m context",
      "effort",
      "not openai-compatible mode",
    ],
    summary:
      "Claude Code uses ZenMux's Anthropic-compatible endpoint via three shell-profile environment variables. Use a model API key (Subscription `sk-ss-v1-...` or PAYG `sk-ai-v1-...`), never a Platform API key. Verify with `/status` inside Claude Code.",
    url: "https://docs.zenmux.ai/best-practices/claude-code",
    facts: [
      'Required env: `ANTHROPIC_BASE_URL="https://zenmux.ai/api/anthropic"`.',
      'Required env: `ANTHROPIC_AUTH_TOKEN="sk-ss-v1-xxx"` (Subscription) or `"sk-ai-v1-xxx"` (PAYG).',
      'Required env: `ANTHROPIC_API_KEY=""` (clear it to avoid conflict with prior Anthropic configs).',
      'Optional model aliases: `ANTHROPIC_DEFAULT_HAIKU_MODEL="claude-haiku-4-5"`, `ANTHROPIC_DEFAULT_SONNET_MODEL="claude-sonnet-4-6"`, `ANTHROPIC_DEFAULT_OPUS_MODEL="claude-opus-4-7"`. Using these alias forms (not `anthropic/claude-...`) is what enables 1M context and `effort` controls.',
      'Optional tweaks: `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"`, `API_TIMEOUT_MS="30000000"`.',
      "Verify after launching: `/status` in Claude Code should show `Auth token: ANTHROPIC_AUTH_TOKEN` and `Anthropic base URL: https://zenmux.ai/api/anthropic`.",
      "As of Claude Code v2.0.7x, set the env vars in the shell profile (`~/.zshrc` or `~/.bashrc`); the `env` block in `~/.claude/settings.json` is not reliably read on first login or after logout.",
    ],
    steps: [
      "Pick a ZenMux model key: Subscription `sk-ss-v1-...` from https://zenmux.ai/platform/subscription, or PAYG `sk-ai-v1-...` from https://zenmux.ai/platform/pay-as-you-go.",
      "Append the env vars to `~/.zshrc` or `~/.bashrc`.",
      "Reload the shell: `source ~/.zshrc` (or open a new terminal).",
      "Run `claude` in your project directory.",
      "Inside Claude Code, run `/status` and confirm both the auth token and base URL.",
    ],
    snippet: {
      language: "bash",
      code: 'export ANTHROPIC_BASE_URL="https://zenmux.ai/api/anthropic"\nexport ANTHROPIC_AUTH_TOKEN="sk-ss-v1-xxx" # or sk-ai-v1-xxx for PAYG\nexport ANTHROPIC_API_KEY=""\n# Optional model aliases enable 1M context + effort controls\nexport ANTHROPIC_DEFAULT_HAIKU_MODEL="claude-haiku-4-5"\nexport ANTHROPIC_DEFAULT_SONNET_MODEL="claude-sonnet-4-6"\nexport ANTHROPIC_DEFAULT_OPUS_MODEL="claude-opus-4-7"',
    },
    warnings: [
      "Do not put Claude Code in OpenAI-compatible mode; use the Anthropic endpoint.",
      "Do not use a Platform API Key here; it is only for `/api/v1/management/*` endpoints and will fail Claude Code authentication.",
      "Do not use the `anthropic/claude-...` slug form for the default model env vars; that disables 1M context and `effort` because Claude Code matches against the alias names.",
    ],
  },
  {
    title: "Codex Integration",
    category: "Best Practices",
    keywords: ["codex", "codex cli", "config.toml", "wire_api", "responses", "ZENMUX_API_KEY", "model_provider"],
    summary:
      "Codex CLI uses the OpenAI Responses protocol against `https://zenmux.ai/api/v1`. Configure it with a TOML file at `~/.codex/config.toml` plus the `ZENMUX_API_KEY` env var (PAYG `sk-ai-v1-...`).",
    url: "https://docs.zenmux.ai/best-practices/codex",
    facts: [
      "Config file path: `~/.codex/config.toml` (create the directory with `mkdir -p ~/.codex` if missing).",
      "Env var name: `ZENMUX_API_KEY` (set in `~/.zshrc` or `~/.bashrc`). Do not use `OPENAI_API_KEY`.",
      'Wire protocol: `wire_api = "responses"` (not Chat Completions).',
      'Base URL: `base_url = "https://zenmux.ai/api/v1"`.',
      "Recommended models for coding: `openai/gpt-5.2-codex`, `anthropic/claude-sonnet-4.5`, `x-ai/grok-code-fast-1`. Full list at https://zenmux.ai/models?sort=newest&supported_protocol=responses.",
    ],
    steps: [
      "Install Codex CLI: `pnpm install -g @openai/codex` (or `npm install -g @openai/codex`).",
      'Add `export ZENMUX_API_KEY="sk-ai-v1-xxx"` to your shell profile and reload it.',
      "Create `~/.codex/config.toml` with the snippet below.",
      "Run `codex` in a project directory.",
    ],
    snippet: {
      language: "toml",
      code: 'model_provider = "zenmux"\nmodel = "openai/gpt-5.2-codex"\n\n[model_providers.zenmux]\nname = "ZenMux"\nbase_url = "https://zenmux.ai/api/v1"\nenv_key = "ZENMUX_API_KEY"\nwire_api = "responses"',
    },
    warnings: [
      'Do not set `wire_api = "chat"`; Codex requires the Responses protocol on ZenMux.',
      "Do not use a Platform API key; account endpoints reject Codex traffic.",
    ],
  },
  {
    title: "Cline Integration",
    category: "Best Practices",
    keywords: ["cline", "vscode", "openai compatible", "base url", "model id", "api provider"],
    summary:
      "Cline connects to ZenMux through its `OpenAI Compatible` API Provider. Set the Base URL to `https://zenmux.ai/api/v1`, paste a ZenMux API key (`sk-ai-v1-...`), and use a ZenMux model slug as the Model ID.",
    url: "https://docs.zenmux.ai/best-practices/cline",
    facts: [
      "Cline UI fields: `API Provider` = `OpenAI Compatible`, `Base URL` = `https://zenmux.ai/api/v1`, `OpenAI Compatible API Key` = your ZenMux key, `Model ID` = a ZenMux model slug (e.g. `anthropic/claude-3.7-sonnet`).",
      "Recommended ZenMux key: PAYG `sk-ai-v1-...`.",
      "Model slugs come from https://zenmux.ai/models.",
    ],
    steps: [
      "Open the Cline panel in VSCode.",
      "Click the gear icon → API Configuration.",
      "Set API Provider to `OpenAI Compatible`.",
      "Set Base URL to `https://zenmux.ai/api/v1`.",
      "Paste your ZenMux API key into `OpenAI Compatible API Key`.",
      "Enter a ZenMux model slug into `Model ID` and click `Done`.",
    ],
    warnings: ["Do not pick the generic `OpenAI` provider; that hits OpenAI directly. Use `OpenAI Compatible`."],
  },
  {
    title: "Open WebUI Integration",
    category: "Best Practices",
    keywords: ["open webui", "open-webui", "base url", "openai compatible", "external connection", "admin panel"],
    summary:
      "Open WebUI talks to ZenMux through its OpenAI external connection list. URL is `https://zenmux.ai/api/v1` and the API Key is any ZenMux model API key. Open WebUI will auto-sync the model list.",
    url: "https://docs.zenmux.ai/best-practices/open-webui",
    facts: [
      "Navigation: `Admin Panel` → `Settings` → `Connections` → `OpenAI API` → `Manage OpenAI API Connections` → `+` Create New External Link.",
      "URL field: `https://zenmux.ai/api/v1`.",
      "API Key field: a ZenMux Subscription (`sk-ss-v1-...`) or PAYG (`sk-ai-v1-...`) key.",
      "Open WebUI auto-syncs all ZenMux models and selects one by default.",
    ],
    steps: [
      "Open Open WebUI Admin Panel.",
      "Go to Settings → Connections → OpenAI API → Manage OpenAI API Connections.",
      "Click `+` and create a new external link.",
      "Set URL to `https://zenmux.ai/api/v1` and paste your ZenMux API key.",
      "Click Save, open a new chat, and pick a ZenMux model from the top-left.",
    ],
  },
  {
    title: "FAQ",
    category: "Help",
    keywords: ["faq", "help", "support", "question"],
    summary: "The FAQ covers common ZenMux questions and troubleshooting guidance.",
    url: "https://docs.zenmux.ai/help/faq",
  },
];
