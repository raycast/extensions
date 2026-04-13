import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

interface Preferences {
  apiKey?: string;
}

export interface PollinationsModel {
  name: string;
  description: string;
  tier: "anonymous" | "seed" | "flower" | "nectar";
  reasoning?: boolean;
  vision?: boolean;
  audio?: boolean;
  tools?: boolean;
  aliases?: string[];
}

const STORAGE_KEY = "selected-model";
const DEFAULT_MODEL = "openai";

// ─── Known model catalogue (sourced from pollinations/shared/registry/text.ts)
// The /models endpoint only returns anonymous-tier models regardless of key,
// so we maintain this curated list and merge it with any runtime additions.
const KNOWN_MODELS: PollinationsModel[] = [
  // ── Anonymous (free, no key needed) ────────────────────────────────────────
  {
    name: "openai",
    description: "GPT-5 Mini — fast and free",
    tier: "anonymous",
    tools: true,
  },
  {
    name: "openai-fast",
    description: "GPT-5 Nano / OVH — fastest, free",
    tier: "anonymous",
    reasoning: true,
    tools: true,
  },
  {
    name: "mistral",
    description: "Mistral Small 3.2 24B — free",
    tier: "anonymous",
  },
  {
    name: "qwen-coder",
    description: "Qwen 2.5 Coder 32B — free, great for code",
    tier: "anonymous",
  },
  // ── Seed (API key required) ─────────────────────────────────────────────────
  {
    name: "openai-large",
    description: "GPT-5 Chat — most capable OpenAI model",
    tier: "seed",
    tools: true,
  },
  {
    name: "openai-reasoning",
    description: "o4-mini — deep reasoning",
    tier: "seed",
    reasoning: true,
  },
  {
    name: "gemini",
    description: "Gemini 2.5 Flash Lite — Google",
    tier: "seed",
  },
  {
    name: "gemini-search",
    description: "Gemini 2.5 Flash + web search",
    tier: "seed",
  },
  {
    name: "deepseek",
    description: "DeepSeek V3.1 — strong reasoning",
    tier: "seed",
    reasoning: true,
  },
  // ── Flower (higher-tier key) ────────────────────────────────────────────────
  {
    name: "claudyclaude",
    description: "Claude Haiku 4.5 — Anthropic",
    tier: "flower",
  },
];

// ─── Persistence ──────────────────────────────────────────────────────────────

export async function getStoredModel(): Promise<string> {
  return (await LocalStorage.getItem<string>(STORAGE_KEY)) ?? DEFAULT_MODEL;
}

export async function storeModel(model: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, model);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useModels() {
  const [models, setModels] = useState<PollinationsModel[]>(KNOWN_MODELS);
  const [selectedModel, setSelectedModelState] =
    useState<string>(DEFAULT_MODEL);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // Restore persisted model selection
  useEffect(() => {
    getStoredModel().then(setSelectedModelState);
  }, []);

  // Fetch live models and merge with known list.
  // The API may return additional/newer models not yet in KNOWN_MODELS.
  useEffect(() => {
    async function fetchModels() {
      const prefs = getPreferenceValues<Preferences>();
      const headers: Record<string, string> = {};
      const key = prefs.apiKey?.trim();
      if (key) headers["Authorization"] = `Bearer ${key}`;

      try {
        const res = await fetch("https://text.pollinations.ai/models", {
          headers,
        });
        if (res.ok) {
          const live: PollinationsModel[] = await res.json();

          // Merge: start with known list, append any live model not already present
          const knownNames = new Set(KNOWN_MODELS.map((m) => m.name));
          const extras = live.filter(
            (m) =>
              !knownNames.has(m.name) &&
              !m.audio &&
              (
                m as { output_modalities?: string[] }
              ).output_modalities?.includes("text") !== false,
          );

          if (extras.length > 0) {
            setModels([...KNOWN_MODELS, ...extras]);
          }
        }
      } catch {
        // Network failure — KNOWN_MODELS already set as default
      } finally {
        setIsLoadingModels(false);
      }
    }

    fetchModels();
  }, []);

  const selectModel = async (model: string) => {
    setSelectedModelState(model);
    await storeModel(model);
  };

  return { models, selectedModel, selectModel, isLoadingModels };
}
