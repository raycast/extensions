import { LocalStorage } from "@raycast/api";

const API_KEY_STORAGE_KEY = "vercel-api-key";
const TRACKED_PROJECT_STORAGE_KEY = "tracked-project";

export type TrackedProject = {
  id: string;
  name: string;
  accountId?: string;
};

export async function getApiKey(): Promise<string | null> {
  const value = await LocalStorage.getItem<string>(API_KEY_STORAGE_KEY);
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  return value;
}

export async function setApiKey(apiKey: string): Promise<void> {
  await LocalStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
}

export async function clearApiKey(): Promise<void> {
  await LocalStorage.removeItem(API_KEY_STORAGE_KEY);
}

export async function getTrackedProject(): Promise<TrackedProject | null> {
  const rawValue = await LocalStorage.getItem<string>(TRACKED_PROJECT_STORAGE_KEY);
  if (!rawValue || typeof rawValue !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<TrackedProject>;
    if (!parsed.id || !parsed.name) {
      return null;
    }

    return {
      id: parsed.id,
      name: parsed.name,
      accountId: typeof parsed.accountId === "string" ? parsed.accountId : undefined,
    };
  } catch {
    return null;
  }
}

export async function setTrackedProject(project: TrackedProject): Promise<void> {
  await LocalStorage.setItem(TRACKED_PROJECT_STORAGE_KEY, JSON.stringify(project));
}
