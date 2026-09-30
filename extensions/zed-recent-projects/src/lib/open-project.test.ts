import { describe, expect, it, vi } from "vitest";
import { openProject } from "./open-project";

describe("openProject", () => {
  it("opens the project before closing Raycast", async () => {
    const calls: string[] = [];
    const open = vi.fn(async () => {
      calls.push("open");
    });
    const close = vi.fn(async () => {
      calls.push("close");
    });

    await openProject(open, close);

    expect(calls).toEqual(["open", "close"]);
  });
});
