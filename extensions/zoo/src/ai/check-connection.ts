import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ConfigurationError, resolveSettings } from "./config";

export async function checkConnection(
  settings: ReturnType<typeof resolveSettings>,
  apiKey: string,
  signal: AbortSignal,
) {
  if (!apiKey.trim())
    throw new ConfigurationError("Set the API key for your selected AI provider in extension settings.");
  const options = { apiKey: apiKey.trim(), baseURL: settings.baseURL, maxRetries: 0, timeout: 15_000 };
  const models =
    settings.provider === "anthropic"
      ? new Anthropic(options).models.list({}, { signal })
      : new OpenAI(options).models.list({ signal });
  for await (const model of models) {
    if (model.id === settings.model || model.id === `models/${settings.model}`) return true;
  }
  return false;
}
