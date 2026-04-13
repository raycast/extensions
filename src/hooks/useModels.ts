import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

interface Preferences {
  apiKey?: string;
}

export interface PollinationsModel {
  name: string;
  description: string;
  isPaid: boolean;
  reasoning?: boolean;
  vision?: boolean;
  tools?: boolean;
  search?: boolean;
}

const STORAGE_KEY = "selected-model";
const DEFAULT_MODEL = "openai";
const MODELS_URL = "https://gen.pollinations.ai/v1/models";

// ─── Persistence ──────────────────────────────────────────────────────────────

export async function getStoredModel(): Promise<string> {
  return (await LocalStorage.getItem<string>(STORAGE_KEY)) ?? DEFAULT_MODEL;
}

export async function storeModel(model: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, model);
}

// ─── Parse OpenAI /v1/models response ────────────────────────────────────────

interface RawModel {
  id: string;
  description?: string;
  capabilities?: string[];
  owned_by?: string;
}

function parseModels(
  raw: { data?: RawModel[] } | RawModel[],
): PollinationsModel[] {
  const items: RawModel[] = Array.isArray(raw) ? raw : (raw.data ?? []);

  return items
    .filter(
      (m) =>
        m.id &&
        !m.id.includes("audio") &&
        !m.id.includes("whisper") &&
        !m.id.includes("scribe"),
    )
    .map((m) => {
      const desc = m.description ?? "";
      const caps = m.capabilities ?? [];

      // Determine paid tier from description marker or capabilities
      const isPaid = desc.toLowerCase().includes("(paid)");

      // Parse capability tags from description like [tools, reasoning, search]
      const tagMatch = desc.match(/\[([^\]]+)\]/);
      const tags = tagMatch
        ? tagMatch[1].split(",").map((t) => t.trim())
        : caps;

      // Clean description: remove the [tags] and (paid) suffixes
      const cleanDesc = desc
        .replace(/\s*\[[^\]]*\]/g, "")
        .replace(/\s*\(paid\)/gi, "")
        .replace(/\s*\(alpha\)/gi, "")
        .replace(/\s*\(preview\)/gi, "")
        .trim();

      return {
        name: m.id,
        description: cleanDesc,
        isPaid,
        reasoning: tags.includes("reasoning"),
        vision: tags.includes("vision") || m.id.includes("vision"),
        tools: tags.includes("tools"),
        search: tags.includes("search"),
      };
    });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useModels() {
  // Start with undefined to distinguish "not loaded yet" from "loaded as default"
  const [selectedModel, setSelectedModelState] = useState<string | undefined>(
    undefined,
  );
  const [models, setModels] = useState<PollinationsModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // Load persisted model selection first
  useEffect(() => {
    getStoredModel().then(setSelectedModelState);
  }, []);

  // Fetch live model list from gen.pollinations.ai/v1/models (no auth needed)
  useEffect(() => {
    async function fetchModels() {
      const prefs = getPreferenceValues<Preferences>();
      const headers: Record<string, string> = {};
      const key = prefs.apiKey?.trim();
      if (key) headers["Authorization"] = `Bearer ${key}`;

      try {
        const res = await fetch(MODELS_URL, { headers });
        if (res.ok) {
          const raw = await res.json();
          const parsed = parseModels(raw);
          if (parsed.length > 0) {
            setModels(parsed);
          }
        }
      } catch {
        // Network failure — models list stays empty, UI shows model name only
      } finally {
        setIsLoadingModels(false);
      }
    }

    fetchModels();
  }, []);

  const resolvedModel = selectedModel ?? DEFAULT_MODEL;

  const selectModel = async (model: string) => {
    setSelectedModelState(model);
    await storeModel(model);
  };

  const activeModel = models.find((m) => m.name === resolvedModel);

  return {
    models,
    selectedModel: resolvedModel,
    activeModel,
    selectModel,
    isLoadingModels: isLoadingModels || selectedModel === undefined,
  };
}
