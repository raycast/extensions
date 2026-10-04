import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@raycast/api", () => ({
  PopToRootType: { Suspended: "suspended" },
  popToRoot: vi.fn(async () => {}),
}));

import { popToRoot } from "@raycast/api";
import { openProject } from "./open-project";

describe("openProject", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dismisses during launch and returns to root only after success", async () => {
    let finishOpening!: () => void;
    const launching = new Promise<void>((resolve) => {
      finishOpening = resolve;
    });
    const open = vi.fn(() => launching);
    const close = vi.fn(async () => {
      expect(open).toHaveBeenCalled();
    });

    const result = openProject(open, close);

    expect(close).toHaveBeenCalledWith({ popToRootType: "suspended" });
    expect(popToRoot).not.toHaveBeenCalled();
    finishOpening();
    await result;
    expect(popToRoot).toHaveBeenCalledOnce();
  });

  it("preserves the project list and propagates late launch failures", async () => {
    const error = new Error("Zed launch failed");
    let failOpening!: (error: Error) => void;
    const launching = new Promise<void>((_, reject) => {
      failOpening = reject;
    });
    const close = vi.fn(async () => {});
    const result = openProject(() => launching, close);
    const rejection = expect(result).rejects.toBe(error);

    await close.mock.results[0].value;
    failOpening(error);
    await rejection;
    expect(popToRoot).not.toHaveBeenCalled();
  });
});
