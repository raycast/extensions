import { LocalStorage } from "@raycast/api";

// 定义预设接口
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

// 预设存储键
const PRESETS_STORAGE_KEY = "zipic_presets";
const DEFAULT_PRESET_KEY = "zipic_default_preset";

// 获取所有预设
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

// 保存预设
export async function savePreset(preset: Preset): Promise<void> {
  const presets = await getPresets();

  // 检查是否已存在同名预设
  const existingIndex = presets.findIndex((p) => p.id === preset.id);

  if (existingIndex >= 0) {
    // 更新现有预设
    presets[existingIndex] = preset;
  } else {
    // 添加新预设
    presets.push(preset);
  }

  await LocalStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

// 删除预设
export async function deletePreset(presetId: string): Promise<void> {
  const presets = await getPresets();
  const filteredPresets = presets.filter((p) => p.id !== presetId);
  await LocalStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filteredPresets));

  // 如果删除的是默认预设，也清除默认预设设置
  const defaultPresetId = await getDefaultPresetId();
  if (defaultPresetId === presetId) {
    await setDefaultPresetId(null);
  }
}

// 获取默认预设ID
export async function getDefaultPresetId(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(DEFAULT_PRESET_KEY)) || null;
}

// 设置默认预设ID
export async function setDefaultPresetId(presetId: string | null): Promise<void> {
  if (presetId) {
    await LocalStorage.setItem(DEFAULT_PRESET_KEY, presetId);
  } else {
    await LocalStorage.removeItem(DEFAULT_PRESET_KEY);
  }
}

// 获取默认预设
export async function getDefaultPreset(): Promise<Preset | null> {
  const defaultPresetId = await getDefaultPresetId();

  // 如果没有设置默认预设，返回null
  if (!defaultPresetId) {
    return null;
  }

  // 获取所有预设
  const presets = await getPresets();

  // 查找默认预设
  return presets.find((p) => p.id === defaultPresetId) || null;
}
