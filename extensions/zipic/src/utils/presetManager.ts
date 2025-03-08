import { LocalStorage } from "@raycast/api";

export interface Preset {
  id: string;
  name: string;
  level: string;
  format: string;
  location: string;
  directory: string;
  width: string;
  height: string;
  addSuffix: boolean;
  suffix: string;
  addSubfolder: boolean;
  specified: boolean;
}

const PRESETS_STORAGE_KEY = "zipic_presets";
const DEFAULT_PRESET_KEY = "zipic_default_preset";

export async function getPresets(): Promise<Preset[]> {
  const presetsJson = await LocalStorage.getItem<string>(PRESETS_STORAGE_KEY);
  if (!presetsJson) {
    return [];
  }

  try {
    return JSON.parse(presetsJson);
  } catch (error) {
    console.error("Failed to parse presets:", error);
    return [];
  }
}

export async function savePreset(preset: Preset): Promise<void> {
  const presets = await getPresets();

  const existingIndex = presets.findIndex((p) => p.id === preset.id);

  if (existingIndex >= 0) {
    presets[existingIndex] = preset;
  } else {
    presets.push(preset);
  }

  await LocalStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

export async function deletePreset(presetId: string): Promise<void> {
  const presets = await getPresets();
  const filteredPresets = presets.filter((p) => p.id !== presetId);
  await LocalStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filteredPresets));

  const defaultPresetId = await getDefaultPresetId();
  if (defaultPresetId === presetId) {
    await setDefaultPresetId(null);
  }
}

export async function getDefaultPresetId(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(DEFAULT_PRESET_KEY)) || null;
}

export async function setDefaultPresetId(presetId: string | null): Promise<void> {
  if (presetId) {
    await LocalStorage.setItem(DEFAULT_PRESET_KEY, presetId);
  } else {
    await LocalStorage.removeItem(DEFAULT_PRESET_KEY);
  }
}

export async function getDefaultPreset(): Promise<Preset | null> {
  const defaultPresetId = await getDefaultPresetId();

  if (!defaultPresetId) {
    return null;
  }

  const presets = await getPresets();

  return presets.find((p) => p.id === defaultPresetId) || null;
}
