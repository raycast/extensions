import { LocalStorage } from "@raycast/api";

const DEFAULT_MODEL_KEY = "zo.settings.defaultModel";

export class UserSettings {
  static async getDefaultModel(): Promise<string | undefined> {
    const value = await LocalStorage.getItem<string>(DEFAULT_MODEL_KEY);
    return value ?? undefined;
  }

  static async setDefaultModel(modelId: string): Promise<void> {
    await LocalStorage.setItem(DEFAULT_MODEL_KEY, modelId);
  }
}
