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
  input_modalities?: string[];
  output_modalities?: string[];
}

const STORAGE_KEY = "selected-model";
const DEFAULT_MODEL = "openai";

export async function getStoredModel(): Promise<string> {
  return (await LocalStorage.getItem<string>(STORAGE_KEY)) ?? DEFAULT_MODEL;
}

export async function storeModel(model: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, model);
}

export function useModels() {
  const [models, setModels] = useState<PollinationsModel[]>([]);
  const [selectedModel, setSelectedModelState] =
    useState<string>(DEFAULT_MODEL);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // Load stored model selection
  useEffect(() => {
    getStoredModel().then(setSelectedModelState);
  }, []);

  // Fetch available models from API (key-aware — more models with a key)
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
          const data: PollinationsModel[] = await res.json();
          // Filter out audio-only and hidden/community persona models
          const text = data.filter(
            (m) =>
              !m.audio &&
              (m.output_modalities ?? ["text"]).includes("text") &&
              ![
                "roblox-rp",
                "midijourney",
                "rtist",
                "chickytutor",
                "bidara",
                "unity",
                "evil",
              ].includes(m.name),
          );
          setModels(text);
        }
      } catch {
        // Silently fall back — caller shows default model
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
