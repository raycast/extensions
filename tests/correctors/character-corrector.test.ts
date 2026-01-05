import { describe, it, expect } from "vitest";
import { CharacterCorrector } from "../../src/correctors/character-corrector";

describe("CharacterCorrector", () => {
  const corrector = new CharacterCorrector();

  it("should convert full-width alphanumeric to half-width", () => {
    expect(corrector.handle("１２３４５")).toBe("12345");
    expect(corrector.handle("ＡＢＣｄｅｆ")).toBe("ABCdef");
  });

  it("should fix duplicate punctuation", () => {
    expect(corrector.handle("你好！！")).toBe("你好！");
    expect(corrector.handle("真的吗？？")).toBe("真的吗？");
  });

  it("should use correct punctuation after chinese", () => {
    expect(corrector.handle("你好,世界.")).toBe("你好，世界。");
    expect(corrector.handle("真的?")).toBe("真的？");
    expect(corrector.handle("哇!")).toBe("哇！");
  });
});
