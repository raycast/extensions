import { describe, expect, it, vi } from "vitest";
vi.mock("@raycast/api", () => ({ PopToRootType: { Suspended: "suspended" } }));

import { openProject } from "./open-project";

describe("openProject", () => {
  it("starts launching before closing Raycast without waiting for startup", async () => {
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
    finishOpening();
    await result;
  });

  it("propagates launch failures after Raycast has closed", async () => {
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
  });
});
