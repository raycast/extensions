import { describe, expect, it } from "vitest";
import XiaoheService from "../src/XiaoheService";

describe("XiaoheService", () => {
  describe("convert", () => {
    it("should convert when it is a single character", () => {
      expect(XiaoheService.convert("wo")).toBe("wo");
      expect(XiaoheService.convert("shi")).toBe("ui");
    });

    it("should convert when it is same", () => {
      expect(XiaoheService.convert("ma ma")).toBe("ma ma");
      expect(XiaoheService.convert("shi shi")).toBe("ui ui");
    });

    it("should convert when it is different", () => {
      expect(XiaoheService.convert("ni shi shui")).toBe("ni ui uv");
      expect(XiaoheService.convert("zhong guo")).toBe("vs go");
      expect(XiaoheService.convert("zhong guo ren")).toBe("vs go rf");
      expect(XiaoheService.convert("hao le")).toBe("hc le");
    });

    it("should convert with uppercase Pinyin", () => {
      expect(XiaoheService.convert("ZHONG GUO")).toBe("vs go");
    });

    it("should handle empty string", () => {
      expect(XiaoheService.convert("")).toBe("");
      expect(XiaoheService.convert("   ")).toBe("   ");
      expect(XiaoheService.convert("ni ")).toBe("ni ");
    });

    it("should return ? for unfinished Pinyin", () => {
      expect(XiaoheService.convert("n")).toBe("n?");
      expect(XiaoheService.convert("ni h")).toBe("ni h?");
    });

    it("weird test", () => {
      expect(XiaoheService.convert("long time no see")).toBe("ls t? no s?");
    });
  });

  describe("splitKeys", () => {
    it("should convert xiaohe string into array of keys to highlight", () => {
      expect(XiaoheService.splitKeys("ni hc")).toEqual(["n", "i", "h", "c"]);
      expect(XiaoheService.splitKeys("ni")).toEqual(["n", "i"]);
      expect(XiaoheService.splitKeys("n i h c")).toEqual(["n", "i", "h", "c"]);
      expect(XiaoheService.splitKeys("")).toEqual([]);
      expect(XiaoheService.splitKeys(" ")).toEqual([]);
    });

    it("should not include question mark", () => {
      expect(XiaoheService.splitKeys("ni h?")).toEqual(["n", "i", "h"]);
    });
  });
});
