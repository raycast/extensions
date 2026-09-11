import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorage } from "@raycast/api";
import { __resetLocalStorage } from "../stubs/raycastApi";
import { ActivityStore } from "../../src/core/activity/ActivityStore";

const STORAGE_KEY = "zo.activity.records.v1";

describe("ActivityStore migration", () => {
  beforeEach(() => {
    __resetLocalStorage();
  });

  it("prunes legacy MCP records on read and rewrites storage", async () => {
    await LocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: "legacy-mcp",
          toolName: "files.delete",
          target: "zo-mcp",
          riskLevel: "destructive",
          timestampIso: "2026-01-01T00:00:00.000Z",
          parameters: { path: "/tmp/file.txt" },
          outcome: "success",
        },
        {
          id: "chat-1",
          toolName: "zo.chat",
          target: "zo-api",
          riskLevel: "safe",
          timestampIso: "2026-01-01T00:00:01.000Z",
          parameters: { model: "kimi", prompt: "hi" },
          outcome: "success",
        },
      ]),
    );

    const records = await ActivityStore.list(250);
    expect(records).toHaveLength(1);
    expect(records[0]?.id).toBe("chat-1");

    const persisted = await LocalStorage.getItem<string>(STORAGE_KEY);
    expect(persisted).toBeTruthy();
    expect(JSON.parse(String(persisted))).toEqual([
      {
        id: "chat-1",
        toolName: "zo.chat",
        target: "zo-api",
        riskLevel: "safe",
        timestampIso: "2026-01-01T00:00:01.000Z",
        parameters: { model: "kimi", prompt: "hi" },
        outcome: "success",
      },
    ]);
  });
});
