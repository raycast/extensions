import { describe, it, expect } from "vitest";
import { SpaceCorrector } from "../../src/correctors/space-corrector";

describe("SpaceCorrector", () => {
  const corrector = new SpaceCorrector();

  it("should add space between Chinese and English", () => {
    expect(corrector.handle("你好World")).toBe("你好 World");
    expect(corrector.handle("Hello世界")).toBe("Hello 世界");
  });

  it("should add space between Chinese and Number", () => {
    expect(corrector.handle("你好123")).toBe("你好 123");
    expect(corrector.handle("123世界")).toBe("123 世界");
  });

  it("should handle mixed content", () => {
    expect(corrector.handle("在LeanCloud上，数据存储是围绕AVObject进行的。")).toBe(
      "在 LeanCloud 上，数据存储是围绕 AVObject 进行的。",
    );
  });
});
