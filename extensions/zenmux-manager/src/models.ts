import { AI, Cache, getPreferenceValues } from "@raycast/api";

import {
  CHAT_COMPLETIONS_URL,
  MODELS_URL,
  ZenMuxModelConfigError,
  buildChatCompletionRequest,
  createChatStreamParser,
  modelAccessError,
  parseModelCatalog,
  partsFromCompletion,
  readSseData,
  requireModelApiKey,
  toRegisteredModels,
} from "./zenmux-chat";

const cache = new Cache();
const MODEL_CACHE_KEY = "zenmux-provided-models-v3";
const MODEL_ICON = "extension-icon.png";

export const getModels: AI.GetModels = async () => {
  const apiKey = requireModelApiKey(getPreferenceValues<Preferences>().modelApiKey);

  try {
    const response = await fetch(MODELS_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(20_000),
    });
    const body = await response.text();
    if (!response.ok) {
      throw modelAccessError(response.status, body);
    }

    const models = toRegisteredModels(parseModelCatalog(parseJson(body))).map((model) => ({
      ...model,
      icon: MODEL_ICON,
    }));
    if (models.length === 0) {
      throw new Error("ZenMux returned no text chat models.");
    }

    try {
      cache.set(MODEL_CACHE_KEY, JSON.stringify(models));
    } catch {
      // A very large catalog can exceed the extension cache. Discovery still succeeds.
    }

    return models;
  } catch (error) {
    if (error instanceof ZenMuxModelConfigError) {
      cache.remove(MODEL_CACHE_KEY);
      throw error;
    }

    const cached = readCachedModels();
    if (cached) {
      return cached;
    }

    throw error;
  }
};

export const streamCompletion: AI.StreamCompletion = async function* (model, request) {
  const apiKey = requireModelApiKey(getPreferenceValues<Preferences>().modelApiKey);
  const controller = new AbortController();

  try {
    const response = await fetch(CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildChatCompletionRequest(model, request)),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw modelAccessError(response.status, await response.text());
    }

    if (!response.body) {
      throw new Error("ZenMux returned an empty model response.");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      yield* partsFromCompletion(parseJson(await response.text()));
      return;
    }

    const parser = createChatStreamParser();
    let receivedDone = false;
    for await (const data of readSseData(response.body)) {
      if (data === "[DONE]") {
        receivedDone = true;
        break;
      }

      yield* parser.push(parseJson(data));
    }

    yield* parser.finish(receivedDone);
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
      return;
    }

    throw error;
  } finally {
    controller.abort();
  }
};

function readCachedModels(): AI.RegisteredModel[] | undefined {
  const cached = cache.get(MODEL_CACHE_KEY);
  if (!cached) {
    return undefined;
  }

  try {
    const models = JSON.parse(cached) as AI.RegisteredModel[];
    return Array.isArray(models) && models.length > 0 ? models : undefined;
  } catch {
    return undefined;
  }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error("ZenMux returned an unreadable response.");
  }
}
