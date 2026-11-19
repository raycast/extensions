export type Provider = "openai" | "gemini" | "anthropic" | "deepseek" | "custom";

export interface AISettings {
  provider?: Provider | "auto";
  model?: string;
  custom_model?: string;
  baseurl?: string;
}

export const providers = {
  openai: { name: "OpenAI", baseURL: "https://api.openai.com/v1", model: "gpt-6-luna" },
  gemini: {
    name: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-3.8-flash",
  },
  anthropic: { name: "Anthropic Claude", baseURL: "https://api.anthropic.com", model: "claude-sonnet-5-5" },
  deepseek: { name: "DeepSeek", baseURL: "https://api.deepseek.com", model: "deepseek-flash" },
  custom: { name: "Custom OpenAI-Compatible API", baseURL: "", model: "" },
} as const;

export class ConfigurationError extends Error {}

function modelProvider(model: string): Provider | undefined {
  if (model.startsWith("gemini-") || model.startsWith("learnlm-")) return "gemini";
  if (model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("deepseek-")) return "deepseek";
  if (/^(gpt-|chatgpt-|o[134](?:-|$))/.test(model)) return "openai";
}

export function resolveSettings(settings: AISettings) {
  const chosenModel = settings.custom_model?.trim() || settings.model?.trim();
  const model = chosenModel === "default" ? "" : chosenModel || "";
  const endpoint = settings.baseurl?.trim().replace(/\/+$/, "") || "";
  let provider = settings.provider || "auto";
  let baseURL = "";

  if (provider === "auto") {
    if (endpoint && endpoint !== providers.openai.baseURL) {
      let url: URL;
      try {
        url = new URL(endpoint);
      } catch {
        throw new ConfigurationError("The API endpoint must be a valid HTTP or HTTPS URL.");
      }
      const hostProviders: Record<string, Provider> = {
        "generativelanguage.googleapis.com": "gemini",
        "api.anthropic.com": "anthropic",
        "api.deepseek.com": "deepseek",
        "api.openai.com": "openai",
      };
      provider = hostProviders[url.hostname] || "custom";
      baseURL = endpoint;
    } else {
      provider = modelProvider(model) || "openai";
    }
  }

  if (provider === "custom") {
    baseURL = endpoint;
    if (!baseURL || !model) {
      throw new ConfigurationError("Set an API endpoint and a custom model ID for your compatible service.");
    }
  } else {
    baseURL ||= providers[provider].baseURL;
    const inferred = modelProvider(model);
    if (model && inferred && inferred !== provider) {
      throw new ConfigurationError("The model belongs to a different service. Change the model or AI provider.");
    }
  }

  let url: URL;
  try {
    url = new URL(baseURL);
  } catch {
    throw new ConfigurationError("The API endpoint must be a valid HTTP or HTTPS URL.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new ConfigurationError(
      "Use an HTTP or HTTPS API base URL without credentials, query parameters, or a fragment.",
    );
  }

  if (provider === "anthropic") baseURL = baseURL.replace(/\/v1$/, "");
  if (provider === "gemini" && /\/v1(?:beta)?$/.test(baseURL)) baseURL += "/openai";

  return { provider, baseURL, model: model || providers[provider].model };
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export function estimateCost(usage: TokenUsage | undefined, inputPrice?: string, outputPrice?: string) {
  if (!usage || !inputPrice?.trim() || !outputPrice?.trim()) return undefined;
  const input = Number(inputPrice);
  const output = Number(outputPrice);
  if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) return undefined;
  return (usage.inputTokens * input + usage.outputTokens * output) / 1_000_000;
}

export function describeError(error: unknown) {
  if (error instanceof ConfigurationError) return error.message;
  const failure = error as {
    status?: number;
    code?: unknown;
    message?: string;
    error?: { message?: string; status?: string; code?: unknown; details?: { reason?: string }[] };
  } | null;
  const status = failure?.status;
  const body = failure?.error;
  const diagnostic = [
    failure?.message,
    failure?.code,
    body?.message,
    body?.status,
    body?.code,
    ...(Array.isArray(body?.details) ? body.details.map((detail) => detail.reason) : []),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  const prefix = status && Number.isInteger(status) && status >= 400 && status <= 599 ? `HTTP ${status}: ` : "";

  // Google can report authentication and account failures as HTTP 400.
  // Only fixed diagnostic messages are displayed, so provider responses cannot expose request data or credentials.
  const reasons: Record<string, string> = {
    API_KEY_INVALID: "The service rejected the API key. Check that it is valid and belongs to the selected provider.",
    API_KEY_EXPIRED: "The API key has expired. Replace it in Zoo's AI settings.",
    API_KEY_SERVICE_BLOCKED:
      "The API key is not allowed to call this API. Check its API restrictions in the provider console.",
    API_KEY_HTTP_REFERRER_BLOCKED:
      "The API key only allows specific websites. Use a key permitted for desktop API requests.",
    API_KEY_IP_ADDRESS_BLOCKED: "The API key does not allow requests from this IP address. Check its restrictions.",
    SERVICE_DISABLED: "The required API is disabled for this project. Enable it in the provider console.",
    BILLING_DISABLED: "API billing is disabled for this project. Check billing in the provider console.",
  };
  for (const [reason, message] of Object.entries(reasons)) {
    if (new RegExp(`\\b${reason}\\b`, "i").test(diagnostic)) return `${prefix}${message} (${reason})`;
  }
  if (/api.?key.{0,40}(?:not valid|invalid|expired)|(?:invalid|expired).{0,20}api.?key/i.test(diagnostic)) {
    return `${prefix}The service rejected the API key. Check that it is valid and belongs to the selected provider.`;
  }
  if (
    /location is not supported|unsupported (?:country|region)|not available in your (?:country|region)/i.test(
      diagnostic,
    )
  ) {
    return `${prefix}The service is unavailable in your current region. Check the provider's supported regions and account requirements.`;
  }
  if (/billing|free.?tier|paid plan|prepay|payment required/i.test(diagnostic)) {
    return `${prefix}The service requires billing or API credits for this request. Check the project's billing and model access.`;
  }
  if (/stream_options|include_usage/i.test(diagnostic)) {
    return `${prefix}The endpoint rejected streaming usage options. Check that it supports this model's Chat Completions API.`;
  }
  if (
    /context.{0,30}(?:length|limit)|too many tokens|input.{0,20}too (?:long|large)|token.{0,30}exceed/i.test(diagnostic)
  ) {
    return `${prefix}The input exceeds the model's context limit. Shorten the selected text or Gist prompt.`;
  }
  if (status === 401 || status === 403)
    return `${prefix}The service rejected access. Check the API key and model permissions.`;
  if (status === 404)
    return `${prefix}The model or endpoint was not found. Check your provider, model ID, and API endpoint.`;
  if (status === 429)
    return `${prefix}The service's quota or rate limit was reached. Check your API balance or try again later.`;
  if (status === 400 || status === 422) {
    const state = ["INVALID_ARGUMENT", "FAILED_PRECONDITION"].find((value) => diagnostic.includes(value));
    return `${prefix}The service rejected the request${state ? ` (${state})` : ""}. Check the API key, project access, model ID, and input length.`;
  }
  if (status && status >= 500) return `${prefix}The AI service is temporarily unavailable. Try again later.`;
  return "The request failed. Check your network connection and AI settings, then try again.";
}
