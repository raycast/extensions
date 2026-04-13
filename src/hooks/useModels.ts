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

// ─── Module-level cache & event emitter ──────────────────────────────────────
// Raycast freezes parent views when a child is pushed, so React state updates
// from within a pushed view don't propagate back until pop — by which time the
// render has already happened with stale state.
// Solution: keep a synchronous module-level cache and notify all hook instances
// immediately when the model changes.

let _modelCache: string = DEFAULT_MODEL;
const _listeners = new Set<(model: string) => void>();

function notifyModelChange(model: string) {
  _modelCache = model;
  _listeners.forEach((fn) => fn(model));
}

// ─── Persistence ──────────────────────────────────────────────────────────────

export async function getStoredModel(): Promise<string> {
  return (await LocalStorage.getItem<string>(STORAGE_KEY)) ?? DEFAULT_MODEL;
}

export async function storeModel(model: string): Promise<void> {
  notifyModelChange(model); // update cache + all hooks synchronously
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
  // Initialize from module-level cache (synchronous — no flash of wrong model)
  const [selectedModel, setSelectedModelState] = useState<string>(_modelCache);
  const [models, setModels] = useState<PollinationsModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // On first mount, read from LocalStorage to restore persisted selection
  useEffect(() => {
    getStoredModel().then((stored) => {
      if (stored !== _modelCache) notifyModelChange(stored);
      else setSelectedModelState(stored);
    });
  }, []);

  // Subscribe to model changes from any hook instance or navigation level
  useEffect(() => {
    const handler = (model: string) => setSelectedModelState(model);
    _listeners.add(handler);
    return () => {
      _listeners.delete(handler);
    };
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

  const selectModel = async (model: string) => {
    await storeModel(model); // notifyModelChange inside → updates all listeners
  };

  const activeModel = models.find((m) => m.name === selectedModel);

  return {
    models,
    selectedModel,
    activeModel,
    selectModel,
    isLoadingModels,
  };
}
