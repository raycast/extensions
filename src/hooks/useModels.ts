import { LocalStorage } from "@raycast/api";
import { useEffect, useReducer, useState } from "react";

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
const DEFAULT_MODEL = "mistral";
const MODELS_URL = "https://gen.pollinations.ai/models";

// ─── Module-level cache & listeners ──────────────────────────────────────────
// selectedModel is NOT stored in React state — it's read directly from
// _modelCache on every render. Listeners only trigger forceUpdate so the
// component re-renders and picks up the latest _modelCache value.
// This bypasses Raycast's navigation freeze: even if state updates are
// suppressed while a child view is pushed, a forceUpdate on pop causes
// a fresh read of _modelCache which is always up-to-date.

let _modelCache: string = DEFAULT_MODEL;
const _listeners = new Set<() => void>();

function notifyModelChange(model: string) {
  _modelCache = model;
  _listeners.forEach((fn) => fn());
}

// ─── Persistence ──────────────────────────────────────────────────────────────

export async function getStoredModel(): Promise<string> {
  return (await LocalStorage.getItem<string>(STORAGE_KEY)) ?? DEFAULT_MODEL;
}

export async function storeModel(model: string): Promise<void> {
  notifyModelChange(model); // sync: update cache + notify all hooks immediately
  await LocalStorage.setItem(STORAGE_KEY, model);
}

// ─── Parse /models response ───────────────────────────────────────────────────

interface RawModel {
  name: string;
  description?: string;
  paid_only?: boolean;
  reasoning?: boolean;
  input_modalities?: string[];
  output_modalities?: string[];
  tools?: boolean;
}

function parseModels(raw: RawModel[]): PollinationsModel[] {
  return raw
    .filter(
      (m) =>
        m.name &&
        Array.isArray(m.output_modalities) &&
        m.output_modalities.includes("text") &&
        !m.name.includes("audio") &&
        !m.name.includes("whisper") &&
        !m.name.includes("scribe"),
    )
    .map((m) => {
      const desc = (m.description ?? "")
        .replace(/\s*\(alpha\)/gi, "")
        .replace(/\s*\(preview\)/gi, "")
        .trim();
      return {
        name: m.name,
        description: desc,
        isPaid: m.paid_only === true,
        reasoning: m.reasoning === true,
        vision: (m.input_modalities ?? []).includes("image"),
        tools: m.tools === true,
        search: m.name.includes("search"),
      };
    });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useModels(hasKey?: boolean) {
  // forceUpdate triggers re-render; selectedModel is always read from _modelCache
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const [models, setModels] = useState<PollinationsModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // On first mount: load from LocalStorage (handles app restart)
  useEffect(() => {
    getStoredModel().then((stored) => {
      if (stored !== _modelCache) {
        notifyModelChange(stored);
      } else {
        forceUpdate();
      }
    });
  }, []);

  // Subscribe: when any hook calls storeModel, re-render to get fresh _modelCache
  useEffect(() => {
    _listeners.add(forceUpdate);
    return () => {
      _listeners.delete(forceUpdate);
    };
  }, []);

  // Fetch live model list
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch(MODELS_URL);
        if (res.ok) {
          const raw = await res.json();
          const parsed = parseModels(raw);
          if (parsed.length > 0) setModels(parsed);
        }
      } catch {
        // fall through — no models list, UI shows model name only
      } finally {
        setIsLoadingModels(false);
      }
    }
    fetchModels();
  }, []);

  // If not connected, reset to default if selected model is paid
  useEffect(() => {
    if (hasKey !== false || models.length === 0) return;
    const current = models.find((m) => m.name === _modelCache);
    if (current?.isPaid) {
      storeModel(DEFAULT_MODEL);
    }
  }, [models, hasKey]);

  // Always read from module-level cache — never from stale React state
  const selectedModel = _modelCache;
  const activeModel = models.find((m) => m.name === selectedModel);

  const selectModel = async (model: string) => {
    await storeModel(model);
  };

  return { models, selectedModel, activeModel, selectModel, isLoadingModels };
}
