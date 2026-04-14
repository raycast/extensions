import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useReducer, useState } from "react";
import type { Preferences } from "../api/pollinations";

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

// ─── Parse /v1/models response ────────────────────────────────────────────────

interface RawModel {
  id: string;
  description?: string;
  capabilities?: string[];
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
      const isPaid = desc.toLowerCase().includes("(paid)");
      const tagMatch = desc.match(/\[([^\]]+)\]/);
      const tags = tagMatch
        ? tagMatch[1].split(",").map((t) => t.trim())
        : caps;
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
      const prefs = getPreferenceValues<Preferences>();
      const headers: Record<string, string> = {};
      const key = prefs.apiKey?.trim();
      if (key) headers["Authorization"] = `Bearer ${key}`;

      try {
        const res = await fetch(MODELS_URL, { headers });
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

  // Always read from module-level cache — never from stale React state
  const selectedModel = _modelCache;
  const activeModel = models.find((m) => m.name === selectedModel);

  const selectModel = async (model: string) => {
    await storeModel(model);
  };

  return { models, selectedModel, activeModel, selectModel, isLoadingModels };
}
