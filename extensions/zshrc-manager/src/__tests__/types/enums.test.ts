import { describe, it, expect } from "vitest";
import { EntryType, SectionMarkerType } from "../../types/enums";

describe("types/enums.ts", () => {
  describe("EntryType", () => {
    it("should have all expected values", () => {
      expect(EntryType.ALIAS).toBe("alias");
      expect(EntryType.EXPORT).toBe("export");
      expect(EntryType.EVAL).toBe("eval");
      expect(EntryType.SETOPT).toBe("setopt");
      expect(EntryType.PLUGIN).toBe("plugin");
      expect(EntryType.FUNCTION).toBe("function");
      expect(EntryType.SOURCE).toBe("source");
      expect(EntryType.AUTOLOAD).toBe("autoload");
      expect(EntryType.FPATH).toBe("fpath");
      expect(EntryType.PATH).toBe("path");
      expect(EntryType.THEME).toBe("theme");
      expect(EntryType.COMPLETION).toBe("completion");
      expect(EntryType.HISTORY).toBe("history");
      expect(EntryType.KEYBINDING).toBe("keybinding");
      expect(EntryType.OTHER).toBe("other");
    });

    it("should have unique values", () => {
      const values = Object.values(EntryType);
      expect(new Set(values).size).toBe(values.length);
    });
  });

  describe("SectionMarkerType", () => {
    it("should have all expected values", () => {
      expect(SectionMarkerType.LABELED).toBe("labeled");
      expect(SectionMarkerType.DASHED_START).toBe("dashed_start");
      expect(SectionMarkerType.DASHED_END).toBe("dashed_end");
      expect(SectionMarkerType.BRACKETED).toBe("bracketed");
      expect(SectionMarkerType.HASH).toBe("hash");
      expect(SectionMarkerType.CUSTOM_START).toBe("custom_start");
      expect(SectionMarkerType.CUSTOM_END).toBe("custom_end");
      expect(SectionMarkerType.FUNCTION_START).toBe("function_start");
      expect(SectionMarkerType.FUNCTION_END).toBe("function_end");
    });

    it("should have unique values", () => {
      const values = Object.values(SectionMarkerType);
      expect(new Set(values).size).toBe(values.length);
    });
  });
});
