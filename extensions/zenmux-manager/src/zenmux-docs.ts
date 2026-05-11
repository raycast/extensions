export type ZenMuxDocEntry = {
  title: string;
  category: string;
  keywords: string[];
  summary: string;
  url: string;
};

export const ZENMUX_DOCS: ZenMuxDocEntry[] = [
  {
    title: "ZenMux Introduction",
    category: "Overview",
    keywords: [
      "what is zenmux",
      "overview",
      "architecture",
      "llm aggregation",
      "insurance",
      "providers",
    ],
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
      "first request",
    ],
    summary:
      "Start with ZenMux by signing in, choosing Pay As You Go or Builder Plan, creating an API key, and calling one of the supported protocols. Base URLs include OpenAI-compatible `https://zenmux.ai/api/v1`, Anthropic `https://zenmux.ai/api/anthropic`, and Vertex AI `https://zenmux.ai/api/vertex-ai`.",
    url: "https://docs.zenmux.ai/guide/quickstart",
  },
  {
    title: "Pay As You Go",
    category: "Billing",
    keywords: [
      "payg",
      "pay as you go",
      "balance",
      "credits",
      "top up",
      "production",
      "billing",
    ],
    summary:
      "Pay As You Go is ZenMux's production-oriented billing plan with prepaid USD credits and usage-based billing. The console shows total balance, top-up credits, and bonus credits.",
    url: "https://docs.zenmux.ai/guide/pay-as-you-go",
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
      "weekly",
      "monthly",
      "extra usage",
    ],
    summary:
      "ZenMux Builder Plan is a fixed monthly subscription intended for personal development and learning. It uses Flow-based quotas with 5-hour and weekly rolling windows plus a monthly cap.",
    url: "https://docs.zenmux.ai/guide/subscription",
  },
  {
    title: "Request Logs",
    category: "Observability",
    keywords: [
      "logs",
      "request logs",
      "tokens",
      "cost",
      "latency",
      "throughput",
      "request details",
      "debug",
    ],
    summary:
      "The ZenMux Logs console shows detailed API call records including timestamp, model, input/output tokens, cost, latency, throughput, finish reason, and request details.",
    url: "https://docs.zenmux.ai/guide/observability/logs",
  },
  {
    title: "Usage Analytics",
    category: "Observability",
    keywords: [
      "usage",
      "analytics",
      "statistics",
      "tokens",
      "cost trend",
      "timeseries",
      "leaderboard",
      "market share",
    ],
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
      "cost",
    ],
    summary:
      "Provider routing lets users pin a model request to a specific upstream provider using `model_slug:provider_slug`. ZenMux otherwise uses intelligent routing to optimize performance and availability.",
    url: "https://docs.zenmux.ai/guide/advanced/provider-routing",
  },
  {
    title: "Model Routing",
    category: "Advanced",
    keywords: [
      "model routing",
      "routing",
      "models",
      "fallback route",
      "multiple models",
      "route",
    ],
    summary:
      "Model routing controls how ZenMux chooses among models for a request, including multi-model routing and fallback-style behavior.",
    url: "https://docs.zenmux.ai/guide/advanced/model-routing",
  },
  {
    title: "Fallback Mechanism",
    category: "Advanced",
    keywords: [
      "fallback",
      "failover",
      "backup model",
      "provider fallback",
      "model failure",
      "route fallback",
    ],
    summary:
      "Fallback is ZenMux's fault-tolerance mechanism. Users can configure global or per-request fallback models so requests can continue when a primary model or routing strategy fails.",
    url: "https://docs.zenmux.ai/guide/advanced/fallback",
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
    keywords: [
      "tools",
      "tool calling",
      "function calling",
      "tool_use",
      "functions",
    ],
    summary:
      "ZenMux supports tool/function calling across compatible models and protocols, with transformations for providers that use different tool formats.",
    url: "https://docs.zenmux.ai/guide/advanced/tool-calls",
  },
  {
    title: "Structured Output",
    category: "Advanced",
    keywords: [
      "structured output",
      "json",
      "json schema",
      "response format",
      "json mode",
    ],
    summary:
      "Structured output helps force model responses into JSON or schema-like formats for application integration.",
    url: "https://docs.zenmux.ai/guide/advanced/structured-output",
  },
  {
    title: "Prompt Cache",
    category: "Advanced",
    keywords: [
      "prompt cache",
      "cache",
      "cached tokens",
      "input_cache_read",
      "input_cache_write",
    ],
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
      "429",
    ],
    summary:
      "The error code reference explains common ZenMux API errors and troubleshooting steps for authentication, invalid parameters, rate limits, and upstream failures.",
    url: "https://docs.zenmux.ai/guide/advanced/error-codes",
  },
  {
    title: "OpenAI Chat Completions API",
    category: "API Reference",
    keywords: [
      "openai",
      "chat completions",
      "api/v1",
      "messages",
      "base_url",
      "sdk",
    ],
    summary:
      "ZenMux's OpenAI-compatible Chat Completions endpoint uses `https://zenmux.ai/api/v1` and supports OpenAI SDK-style requests with ZenMux model slugs.",
    url: "https://docs.zenmux.ai/api/openai/create-chat-completion",
  },
  {
    title: "OpenAI Responses API",
    category: "API Reference",
    keywords: [
      "responses api",
      "openai responses",
      "input",
      "response",
      "api/v1",
    ],
    summary:
      "ZenMux supports OpenAI's Responses API through the same OpenAI-compatible base URL, enabling newer OpenAI-style response workflows.",
    url: "https://docs.zenmux.ai/api/openai/openai-responses",
  },
  {
    title: "Anthropic Messages API",
    category: "API Reference",
    keywords: [
      "anthropic",
      "messages",
      "claude",
      "api/anthropic",
      "anthropic sdk",
    ],
    summary:
      "ZenMux's Anthropic-compatible Messages endpoint uses `https://zenmux.ai/api/anthropic` and supports Claude-family native protocol calls.",
    url: "https://docs.zenmux.ai/api/anthropic/create-messages",
  },
  {
    title: "Vertex AI Generate Content API",
    category: "API Reference",
    keywords: [
      "vertex ai",
      "gemini",
      "generate content",
      "google",
      "api/vertex-ai",
    ],
    summary:
      "ZenMux supports Google Gemini/Vertex AI-style generateContent requests through the Vertex AI-compatible API.",
    url: "https://docs.zenmux.ai/api/vertexai/generate-content",
  },
  {
    title: "Platform API: Subscription Detail",
    category: "Platform API",
    keywords: [
      "platform api",
      "subscription detail",
      "quota",
      "5 hour",
      "7 day",
      "monthly",
      "flow rate",
    ],
    summary:
      "The subscription detail endpoint returns plan tier, account status, Flow rate, 5-hour quota, 7-day quota, and monthly cap. Monthly quota is cap-only and does not include real-time usage.",
    url: "https://docs.zenmux.ai/api/platform/subscription-detail",
  },
  {
    title: "Platform API: PAYG Balance",
    category: "Platform API",
    keywords: [
      "platform api",
      "payg balance",
      "credits",
      "top up",
      "bonus credits",
      "wallet",
    ],
    summary:
      "The PAYG balance endpoint returns total credits, top-up credits, bonus credits, and currency for the current account.",
    url: "https://docs.zenmux.ai/api/platform/payg-balance",
  },
  {
    title: "Platform API: Generation Detail",
    category: "Platform API",
    keywords: [
      "generation",
      "generation id",
      "cost",
      "tokens",
      "latency",
      "request detail",
    ],
    summary:
      "The generation detail endpoint retrieves token usage, latency, cost, model, and other details for a specific generation ID.",
    url: "https://docs.zenmux.ai/api/platform/get-generation",
  },
  {
    title: "Cursor Integration",
    category: "Best Practices",
    keywords: [
      "cursor",
      "cursor pro",
      "custom model",
      "openai api key",
      "override base url",
    ],
    summary:
      "To use ZenMux in Cursor, enable OpenAI API Key, paste a ZenMux API key, set Override OpenAI Base URL to `https://zenmux.ai/api/v1`, and add the desired ZenMux model slugs.",
    url: "https://docs.zenmux.ai/best-practices/cursor",
  },
  {
    title: "Claude Code Integration",
    category: "Best Practices",
    keywords: [
      "claude code",
      "anthropic base url",
      "claude",
      "subscription",
      "payg",
    ],
    summary:
      "The Claude Code guide explains how to point Claude Code at ZenMux using compatible API settings and appropriate ZenMux keys.",
    url: "https://docs.zenmux.ai/best-practices/claude-code",
  },
  {
    title: "Codex Integration",
    category: "Best Practices",
    keywords: [
      "codex",
      "openai compatible",
      "base url",
      "config",
      "openai api",
    ],
    summary:
      "The Codex guide explains how to configure Codex-style tools to use ZenMux's OpenAI-compatible endpoint.",
    url: "https://docs.zenmux.ai/best-practices/codex",
  },
  {
    title: "Cline Integration",
    category: "Best Practices",
    keywords: [
      "cline",
      "vscode",
      "openai compatible",
      "base url",
      "model slug",
    ],
    summary:
      "The Cline guide explains how to configure Cline with ZenMux API keys, base URL, and model slugs.",
    url: "https://docs.zenmux.ai/best-practices/cline",
  },
  {
    title: "Open WebUI Integration",
    category: "Best Practices",
    keywords: ["open webui", "open-webui", "base url", "openai compatible"],
    summary:
      "The Open WebUI guide explains how to configure ZenMux as an OpenAI-compatible provider.",
    url: "https://docs.zenmux.ai/best-practices/open-webui",
  },
  {
    title: "FAQ",
    category: "Help",
    keywords: ["faq", "help", "support", "question"],
    summary:
      "The FAQ covers common ZenMux questions and troubleshooting guidance.",
    url: "https://docs.zenmux.ai/help/faq",
  },
];
