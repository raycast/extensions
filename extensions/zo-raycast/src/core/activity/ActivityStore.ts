import { LocalStorage } from "@raycast/api";
import type { ToolExecutionRecord } from "../../types/domain";
import { redactSensitiveValues } from "./redaction";

const STORAGE_KEY = "zo.activity.records.v1";

function safeParse(raw: string): ToolExecutionRecord[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is ToolExecutionRecord => {
      return typeof item === "object" && item !== null && typeof (item as { id?: unknown }).id === "string";
    });
  } catch {
    return [];
  }
}

export class ActivityStore {
  static async append(record: ToolExecutionRecord): Promise<void> {
    const existing = await ActivityStore.readAll();
    const redactedRecord: ToolExecutionRecord = {
      ...record,
      parameters: (redactSensitiveValues(record.parameters) as Record<string, unknown>) ?? {},
    };

    const next = [redactedRecord, ...existing].slice(0, 250);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  static async list(limit = 50): Promise<ToolExecutionRecord[]> {
    const records = await ActivityStore.readAll();
    return records.slice(0, limit);
  }

  static async clear(): Promise<void> {
    await LocalStorage.removeItem(STORAGE_KEY);
  }

  private static async readAll(): Promise<ToolExecutionRecord[]> {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = safeParse(raw);
    const filtered = parsed.filter((record) => record.target === "zo-api");
    if (filtered.length !== parsed.length) {
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }

    return filtered;
  }
}
