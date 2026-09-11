const RAW_DOC_BASE_URL = "https://raw.githubusercontent.com/ZenMux/zenmux-doc/main/docs_source/en";
const PUBLIC_DOC_BASE_URL = "https://docs.zenmux.ai";

export type DocRoutingRule = {
  triggers: readonly string[];
  paths: readonly string[];
};

export type ZenMuxDocManifestEntry = {
  /** Path relative to docs_source/en. */
  path: string;
  /** Human-readable title derived from the path. */
  title: string;
  /** Public docs URL for citations. */
  url: string;
  /** Raw GitHub markdown URL fetched by the extension at runtime. */
  rawUrl: string;
};

export const DOC_ROUTING_RULES: readonly DocRoutingRule[] = [
  // --- Best-practice integrations (one rule per tool) ---
  {
    triggers: ["claude code", "anthropic_auth_token", "anthropic_base_url"],
    paths: ["best-practices/claude-code.md"],
  },
  {
    triggers: ["cursor", "override openai base url"],
    paths: ["best-practices/cursor.md"],
  },
  {
    triggers: ["codex", "codex cli", "config.toml", "wire_api"],
    paths: ["best-practices/codex.md"],
  },
  {
    triggers: ["cline"],
    paths: ["best-practices/cline.md"],
  },
  {
    triggers: ["open webui", "open-webui", "openwebui"],
    paths: ["best-practices/open-webui.md"],
  },
  {
    triggers: ["hermes", "hermes agent"],
    paths: ["best-practices/hermes-agent.md"],
  },
  {
    triggers: ["rikkahub", "rikka hub"],
    paths: ["best-practices/rikkahub.md"],
  },
  {
    triggers: ["sider"],
    paths: ["best-practices/sider.md"],
  },
  {
    triggers: ["obsidian"],
    paths: ["best-practices/obsidian.md"],
  },
  {
    triggers: ["openclaw"],
    paths: ["best-practices/openclaw.md", "best-practices/openclaw-alibaba.md"],
  },
  {
    triggers: ["neovate"],
    paths: ["best-practices/neovate-code.md"],
  },
  {
    triggers: ["immersive translate", "immersive-translate"],
    paths: ["best-practices/immersive-translate.md"],
  },
  {
    triggers: ["gemini cli", "gemini-cli"],
    paths: ["best-practices/gemini-cli.md"],
  },
  {
    triggers: ["opencode"],
    paths: ["best-practices/opencode.md"],
  },
  {
    triggers: ["github copilot", "copilot"],
    paths: ["best-practices/github-copilot.md"],
  },
  {
    triggers: ["cherry studio", "cherry-studio"],
    paths: ["best-practices/cherry-studio.md"],
  },
  {
    triggers: ["cc-switch", "cc switch"],
    paths: ["best-practices/cc-switch.md"],
  },
  {
    triggers: ["dify"],
    paths: ["best-practices/dify.md"],
  },

  // --- Getting started + product overview ---
  {
    triggers: ["quickstart", "quick start", "getting started", "first request"],
    paths: ["guide/quickstart.md"],
  },
  {
    triggers: ["what is zenmux", "introduction", "overview", "architecture"],
    paths: ["about/intro.md", "about/architecture.md"],
  },
  {
    triggers: ["models", "providers", "model list", "supported models"],
    paths: ["about/models-and-providers.md"],
  },
  {
    triggers: ["benchmark"],
    paths: ["about/zenmux-benchmark.md"],
  },

  // --- Billing, pricing, invoices ---
  {
    triggers: ["subscription", "builder plan", "flow", "5-hour", "7-day"],
    paths: ["guide/subscription.md"],
  },
  {
    triggers: ["payg", "pay as you go", "pay-as-you-go", "credit", "balance"],
    paths: ["guide/pay-as-you-go.md"],
  },
  {
    triggers: ["invoice", "billing", "pricing", "cost"],
    paths: ["about/pricing-and-cost.md", "guide/invoice.md", "guide/observability/pricing.md"],
  },

  // --- Observability ---
  {
    triggers: ["request logs", "logs"],
    paths: ["guide/observability/logs.md"],
  },
  {
    triggers: ["usage", "analytics", "leaderboard", "market share"],
    paths: ["guide/observability/usage.md"],
  },
  {
    triggers: ["insurance", "credit guarantee"],
    paths: ["guide/observability/insurance.md"],
  },
  {
    triggers: ["cost", "spend", "spending"],
    paths: ["guide/observability/cost.md"],
  },

  // --- Advanced features ---
  {
    triggers: ["provider routing", "model_slug:provider_slug", "primary_factor"],
    paths: ["guide/advanced/provider-routing.md"],
  },
  {
    triggers: ["model routing", "model_routing_config", "zenmux/auto"],
    paths: ["guide/advanced/model-routing.md"],
  },
  {
    triggers: ["fallback", "failover", "provider.fallback"],
    paths: ["guide/advanced/fallback.md"],
  },
  {
    triggers: ["streaming", "sse", "server sent"],
    paths: ["guide/advanced/streaming.md"],
  },
  {
    triggers: ["multimodal", "vision", "image input"],
    paths: ["guide/advanced/multimodal.md"],
  },
  {
    triggers: ["structured output", "json mode", "json schema"],
    paths: ["guide/advanced/structured-output.md"],
  },
  {
    triggers: ["tool call", "tool calls", "function calling"],
    paths: ["guide/advanced/tool-calls.md"],
  },
  {
    triggers: ["reasoning", "thinking", "effort"],
    paths: ["guide/advanced/reasoning.md"],
  },
  {
    triggers: ["prompt cache", "cache_read", "cache_write", "caching"],
    paths: ["guide/advanced/prompt-cache.md"],
  },
  {
    triggers: ["image generation", "openai image"],
    paths: ["guide/advanced/image-generation.md", "guide/advanced/openai-image-generation.md"],
  },
  {
    triggers: ["video generation"],
    paths: ["guide/advanced/video-generation.md"],
  },
  {
    triggers: ["web search", "grounding"],
    paths: ["guide/advanced/web-search.md"],
  },
  {
    triggers: ["long context", "1m context", "1m tokens"],
    paths: ["guide/advanced/long-context.md"],
  },
  {
    triggers: ["model alias"],
    paths: ["guide/advanced/model-alias.md"],
  },
  {
    triggers: ["embedding"],
    paths: ["guide/advanced/embeddings.md"],
  },
  {
    triggers: ["error", "401", "403", "404", "429", "rate limit"],
    paths: ["guide/advanced/error-codes.md"],
  },

  // --- Studio / skills ---
  {
    triggers: ["studio", "studio chat"],
    paths: ["guide/studio/studio-chat.md"],
  },
  {
    triggers: ["zenmux skill", "zenmux skills", "statusline"],
    paths: ["guide/zenmux-skills.md"],
  },

  // --- API reference ---
  {
    triggers: ["chat completions", "/v1/chat/completions"],
    paths: ["api/openai/create-chat-completion.md"],
  },
  {
    triggers: ["responses api", "/v1/responses"],
    paths: ["api/openai/openai-responses.md"],
  },
  {
    triggers: ["list models", "/v1/models"],
    paths: [
      "api/openai/openai-list-models.md",
      "api/anthropic/anthropic-list-models.md",
      "api/vertexai/google-list-models.md",
    ],
  },
  {
    triggers: ["anthropic messages", "/v1/messages", "x-api-key"],
    paths: ["api/anthropic/create-messages.md"],
  },
  {
    triggers: ["vertex ai", "generate content", "vertexai", "gemini api"],
    paths: ["api/vertexai/generate-content.md"],
  },
  {
    triggers: ["api overview"],
    paths: ["api/overview.md"],
  },

  // --- Platform API ---
  {
    triggers: ["platform api", "management api", "subscription detail"],
    paths: ["api/platform/subscription-detail.md"],
  },
  {
    triggers: ["payg balance", "/api/v1/management/payg/balance"],
    paths: ["api/platform/payg-balance.md"],
  },
  {
    triggers: ["generation detail", "generation_id"],
    paths: ["api/platform/get-generation.md"],
  },
  {
    triggers: ["flow rate", "flow_rate"],
    paths: ["api/platform/flow-rate.md"],
  },

  // --- Help / legal ---
  {
    triggers: ["faq", "frequently asked"],
    paths: ["help/faq.md"],
  },
  {
    triggers: ["contact", "support email"],
    paths: ["help/contact.md"],
  },
  {
    triggers: ["privacy"],
    paths: ["privacy.md"],
  },
  {
    triggers: ["terms of service", "terms-of-service", "tos"],
    paths: ["terms-of-service.md"],
  },
];

export const ZENMUX_DOC_MANIFEST: readonly ZenMuxDocManifestEntry[] = Array.from(
  new Set(DOC_ROUTING_RULES.flatMap((rule) => rule.paths)),
)
  .sort()
  .map((docPath) => ({
    path: docPath,
    title: titleFromPath(docPath),
    url: docsUrlForPath(docPath),
    rawUrl: rawUrlForPath(docPath),
  }));

/**
 * Return doc paths whose routing rules are triggered by the query.
 *
 * Triggers are case-insensitive substring matches. A path may be returned
 * by multiple rules; the caller should de-duplicate.
 */
export function routingMatches(query: string): string[] {
  const normalized = query.toLowerCase();
  const hits: string[] = [];
  for (const rule of DOC_ROUTING_RULES) {
    if (rule.triggers.some((trigger) => normalized.includes(trigger))) {
      hits.push(...rule.paths);
    }
  }
  return Array.from(new Set(hits));
}

export function manifestEntryForPath(docPath: string): ZenMuxDocManifestEntry | undefined {
  return ZENMUX_DOC_MANIFEST.find((entry) => entry.path === docPath);
}

function rawUrlForPath(docPath: string): string {
  return `${RAW_DOC_BASE_URL}/${docPath}`;
}

function docsUrlForPath(docPath: string): string {
  return `${PUBLIC_DOC_BASE_URL}/${docPath.replace(/\.md$/, "")}`;
}

function titleFromPath(docPath: string): string {
  const filename = docPath.split("/").pop() ?? docPath;
  return filename
    .replace(/\.md$/, "")
    .split("-")
    .map((word) => {
      if (word === "api") return "API";
      if (word === "payg") return "PAYG";
      if (word === "faq") return "FAQ";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
