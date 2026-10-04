import { describe, expect, it, vi } from "vitest";
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

    expect(close).toHaveBeenCalled();
    finishOpening();
    await result;
  });

  it("propagates launch failures to the existing error handler", async () => {
    const error = new Error("Zed launch failed");
    await expect(
      openProject(
        () => Promise.reject(error),
        async () => {},
      ),
    ).rejects.toBe(error);
  });
});
